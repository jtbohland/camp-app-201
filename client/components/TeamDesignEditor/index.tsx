import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";
import TeamLogoStep from "@/components/TeamLogoStep/index.js";
import { refreshTeamData } from "@/lib/teamMoves.js";

// 24 nature palette
const NATURE_PALETTE = [
  "#2d6a4f", "#1b4332", "#40916c", "#52b788", "#606c38", "#283618",
  "#d4a373", "#bc6c25", "#dda15e", "#8b5e3c", "#6f4e37",
  "#3a5a8c", "#2b4570", "#1d3557", "#457b9d",
  "#6b4c9a", "#7b2d8b", "#9c4dcc",
  "#c44536", "#8d2b23", "#e76f51",
  "#264653", "#2a9d8f", "#555b6e",
];

type Props = {
  teamId: number;
  camperId: number;
  currentName: string;
  currentColor: string | null;
  currentLogo: string | null;
  usedColors: string[];
  /** Counselor walkthrough: everything works except saving. */
  demo?: boolean;
  onDone: () => void;
  onCancel: () => void;
};

function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

export default function TeamDesignEditor({
  teamId, camperId, currentName, currentColor, currentLogo, usedColors, demo = false, onDone, onCancel,
}: Props) {
  // Demo starts blank so counselors can show every step from scratch.
  const [name, setName] = useState(demo ? "" : currentName);
  const [color, setColor] = useState(demo ? "" : currentColor || "");
  const [logo, setLogo] = useState(demo ? "" : currentLogo || "");
  const { run: updateDesign, loading } = useApi("UpdateTeamDesign");

  const handleSave = async () => {
    if (demo) return;
    if (!name.trim()) { toast.error("Team name is required"); return; }
    if (!color) { toast.error("Pick a team color"); return; }
    if (!logo) { toast.error("Add a logo for your team!"); return; }
    try {
      const result = await updateDesign({ team_id: teamId, camper_id: camperId, name: name.trim(), logo_url: logo, color });
      if (result?.success) {
        toast.success("Team design saved! 🎨");
        // The new name shows everywhere (Quick cAMP Points, leaderboard, team hub).
        void refreshTeamData();
        onDone();
      } else {
        toast.error(result?.message ?? "Failed to save design");
      }
    } catch (error) {
      toast.error("Error: " + errorText(error));
    }
  };

  const usedLower = usedColors.map((c) => c.toLowerCase());

  return (
    <div className={`rounded-lg border p-4 mb-3 flex flex-col gap-3 ${demo ? "bg-sky-50/70 border-sky-300" : "bg-white/90 border-border"}`}>
      {demo && (
        <div className="flex items-start gap-2 rounded-md bg-sky-100 border border-sky-200 px-3 py-2">
          <Icon icon="presentation" className="w-4 h-4 text-sky-700 mt-0.5 shrink-0" />
          <p className="text-[11px] text-sky-800 leading-snug">
            <strong>Demo only.</strong> Walk your teams through each step. Gemini and uploads work here, but nothing is saved to this team.
          </p>
        </div>
      )}

      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">1. Team Name</label>
        <input
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          placeholder={demo ? "e.g. Summit Seekers" : "Your team name"}
          className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">2. Team Color</label>
        <div className="flex flex-wrap gap-1">
          {NATURE_PALETTE.map((c) => {
            const taken = !demo && usedLower.includes(c.toLowerCase()) && c.toLowerCase() !== currentColor?.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                disabled={taken}
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border transition-all ${
                  color === c ? "border-foreground scale-110 ring-1 ring-primary/30" :
                  taken ? "opacity-20 cursor-not-allowed border-transparent" :
                  "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c }}
              />
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-foreground mb-1">3. Team Logo</p>
        <TeamLogoStep teamName={name} color={color} logo={logo} onChange={setLogo} />
      </div>

      <div className="flex gap-2 justify-end items-center">
        {demo ? (
          <>
            <span className="text-[11px] text-sky-700 flex items-center gap-1 mr-auto">
              <Icon icon="info" className="w-3.5 h-3.5" />
              Teams click Save Design here to finish.
            </span>
            <button onClick={onCancel} className="px-3 py-1.5 text-xs bg-sky-600 text-white rounded hover:bg-sky-700">
              Close Demo
            </button>
          </>
        ) : (
          <>
            <button onClick={onCancel} className="px-3 py-1.5 text-xs border border-border rounded hover:bg-muted">Cancel</button>
            <button onClick={handleSave} disabled={loading} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50">
              {loading ? "Saving..." : "Save Design"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
