import { useState, useCallback } from "react";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";

const TEAM_COLORS = [
  "#2d6a4f", "#1b4332", "#40916c", "#52b788",
  "#d4a373", "#bc6c25", "#606c38", "#283618",
  "#3a5a8c", "#2b4570", "#6b4c9a", "#7b2d8b",
];

type CreateTeamDialogProps = {
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateTeamDialog({ onClose, onCreated }: CreateTeamDialogProps) {
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [color, setColor] = useState(TEAM_COLORS[0]);

  const { run: createTeam, loading } = useApi("CreateTeam");

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) {
      toast.error("Team name is required");
      return;
    }
    try {
      await createTeam({ name: name.trim(), logo_url: logoUrl.trim() || null, color });
      toast.success(`Team "${name}" created!`);
      onCreated();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
      toast.error("Failed to create team: " + message);
    }
  }, [name, logoUrl, color, createTeam, onCreated]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold text-foreground mb-4">Create Team</h2>

        <div className="flex flex-col gap-4">
          {/* Team Name */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Team Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Trail Blazers"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Logo URL (optional)</label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            {logoUrl && (
              <img src={logoUrl} alt="Preview" className="mt-2 w-12 h-12 rounded-full object-cover border border-border" />
            )}
          </div>

          {/* Team Color */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Team Color</label>
            <div className="flex flex-wrap gap-2">
              {TEAM_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c ? "border-foreground scale-110" : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-foreground border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "Creating…" : "Create Team"}
          </button>
        </div>
      </div>
    </div>
  );
}
