import { useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import ImageUpload from "@/components/ImageUpload/index.js";
import { useApi } from "@/hooks/useApi.js";
import { toast } from "sonner";

type TeamMember = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  points: number;
  photo_url: string | null;
};

type Team = {
  id: number;
  name: string;
  logo_url: string | null;
  color: string | null;
  assigned_company?: { slug: string; name: string; emoji: string; color: string; industry: string } | null;
  members: TeamMember[];
  total_points: number;
};

type TeamCardProps = {
  team: Team;
  isAdmin: boolean;
  currentCamperId: number | undefined;
  rank: number;
  totalTeams: number;
  usedColors?: string[];
  onRefresh?: () => void;
};

const RANK_CONFIG: Record<number, { banner: string; bg: string; border: string; glow: string; emoji: string; label: string }> = {
  1: { banner: "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500", bg: "bg-yellow-50", border: "border-yellow-300 ring-2 ring-yellow-300/50", glow: "shadow-lg shadow-yellow-200/50", emoji: "🥇", label: "1ST PLACE" },
  2: { banner: "bg-gradient-to-r from-gray-300 via-slate-300 to-gray-400", bg: "bg-gray-50", border: "border-gray-300 ring-1 ring-gray-200", glow: "shadow-md", emoji: "🥈", label: "2ND PLACE" },
  3: { banner: "bg-gradient-to-r from-orange-300 via-amber-300 to-orange-400", bg: "bg-orange-50", border: "border-orange-200 ring-1 ring-orange-200/50", glow: "shadow-md", emoji: "🥉", label: "3RD PLACE" },
};

const DEFAULT_RANK = { banner: "bg-gradient-to-r from-slate-200 to-slate-300", bg: "bg-card", border: "border-border", glow: "", emoji: "", label: "" };

// 24 nature palette — same as CreateTeamDialog
const NATURE_PALETTE = [
  "#2d6a4f", "#1b4332", "#40916c", "#52b788", "#606c38", "#283618",
  "#d4a373", "#bc6c25", "#dda15e", "#8b5e3c", "#6f4e37",
  "#3a5a8c", "#2b4570", "#1d3557", "#457b9d",
  "#6b4c9a", "#7b2d8b", "#9c4dcc",
  "#c44536", "#8d2b23", "#e76f51",
  "#264653", "#2a9d8f", "#555b6e",
];

export default function TeamCard({ team, isAdmin, currentCamperId, rank, totalTeams, usedColors = [], onRefresh }: TeamCardProps) {
  const navigate = useNavigate();
  const isMyTeam = team.members.some((m) => m.id === currentCamperId);
  const canAccessHub = isAdmin || isMyTeam;
  const teamColor = team.color || "#2d6a4f";
  const config = RANK_CONFIG[rank] ?? DEFAULT_RANK;

  // "Needs design" = generic team name (starts with "Team ") and no logo/color
  const needsDesign = isMyTeam && (!team.logo_url || !team.color);
  const [designing, setDesigning] = useState(false);

  // Top scorer on this team
  const topScorer = team.members.length > 0
    ? team.members.reduce((a, b) => a.points > b.points ? a : b)
    : null;

  return (
    <div className={`rounded-xl overflow-hidden flex flex-col border-2 ${config.border} ${config.glow} transition-all hover:scale-[1.02]`}>
      {/* Rank Banner */}
      <div className={`${config.banner} px-4 py-2 flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {config.emoji && <span className="text-xl">{config.emoji}</span>}
          <span className={`text-xs font-black tracking-widest ${rank <= 3 ? "text-white drop-shadow" : "text-muted-foreground"}`}>
            {config.label || `#${rank}`}
          </span>
        </div>
        <div className={`text-xl font-black ${rank <= 3 ? "text-white drop-shadow" : "text-foreground"}`}>
          {team.total_points} <span className="text-xs font-bold">PTS</span>
        </div>
      </div>

      {/* Team Identity */}
      <div className={`p-4 ${config.bg} flex-1 flex flex-col`}>
        <div className="flex items-center gap-3 mb-3">
          {team.logo_url ? (
            <img src={team.logo_url} alt={team.name} className="w-12 h-12 rounded-full object-cover border-2 border-white shadow" />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow"
              style={{ backgroundColor: teamColor }}
            >
              {team.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-foreground text-lg">{team.name}</h3>
            <p className="text-xs text-muted-foreground">{team.members.length} member{team.members.length !== 1 ? "s" : ""}</p>
            {team.assigned_company && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-sm">{team.assigned_company.emoji}</span>
                <span className="text-xs font-semibold" style={{ color: team.assigned_company.color }}>
                  {team.assigned_company.name}
                </span>
                <span className="text-[10px] text-muted-foreground">• {team.assigned_company.industry}</span>
              </div>
            )}
          </div>
          {isMyTeam && (
            <Badge className="bg-camp-green/15 text-camp-green border-camp-green/30 text-[10px]">⛺ Your Team</Badge>
          )}
        </div>

        {/* Members */}
        <div className="flex flex-wrap gap-1 mb-3">
          {team.members.map((member) => (
            <span
              key={member.id}
              className={`text-xs px-2 py-0.5 rounded-full ${
                member.id === currentCamperId
                  ? "bg-primary/20 text-primary font-medium"
                  : "bg-white/80 text-foreground/70 border border-border/50"
              }`}
            >
              {member.first_name} {member.last_name.charAt(0)}.
              <span className="text-muted-foreground ml-1 text-[10px]">{member.points}</span>
            </span>
          ))}
          {team.members.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No members assigned yet</p>
          )}
        </div>

        {/* Top Scorer callout */}
        {topScorer && topScorer.points > 0 && (
          <div className="bg-white/60 rounded-lg px-3 py-2 flex items-center gap-2 mb-3 border border-border/30">
            <span className="text-sm">⭐</span>
            <span className="text-xs text-foreground/80">
              <strong>{topScorer.first_name} {topScorer.last_name.charAt(0)}.</strong> leads with {topScorer.points} pts
            </span>
          </div>
        )}

        {/* Design prompt for un-designed teams */}
        {needsDesign && !designing && (
          <div className="mb-3 flex flex-col gap-1.5">
            <button
              onClick={() => setDesigning(true)}
              className="px-3 py-2 text-sm font-medium rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-2"
          >
            <Icon icon="palette" className="w-4 h-4" />
            Design Your Team — Add a name, logo & color!
          </button>
            <p className="text-[10px] text-amber-600/70 px-1 leading-tight">
              💡 Pick one teammate to type the name, upload the logo & save — collaborate on the design together, but only one person should submit to avoid conflicts.
            </p>
          </div>
        )}

        {/* Inline design editor */}
        {designing && (
          <DesignEditor
            teamId={team.id}
            camperId={currentCamperId ?? 0}
            currentName={team.name}
            currentColor={team.color}
            currentLogo={team.logo_url}
            usedColors={usedColors}
            onDone={() => { setDesigning(false); onRefresh?.(); }}
            onCancel={() => setDesigning(false)}
          />
        )}

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          {canAccessHub && (
            <button
              onClick={() => navigate(`/teams/${team.id}`)}
              className="flex-1 px-3 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
            >
              <Icon icon="external-link" className="w-3.5 h-3.5" />
              Open Hub
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline team design editor
function DesignEditor({
  teamId,
  camperId,
  currentName,
  currentColor,
  currentLogo,
  usedColors,
  onDone,
  onCancel,
}: {
  teamId: number;
  camperId: number;
  currentName: string;
  currentColor: string | null;
  currentLogo: string | null;
  usedColors: string[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(currentName);
  const [color, setColor] = useState(currentColor || "");
  const [logo, setLogo] = useState(currentLogo || "");

  const { run: updateDesign, loading } = useApi("UpdateTeamDesign");

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Team name is required"); return; }
    if (!logo) { toast.error("Upload a logo for your team!"); return; }
    if (!color) { toast.error("Pick a team color"); return; }

    try {
      // We need to know the current camper ID - pass via a data attribute or context
      const result = await updateDesign({
        team_id: teamId,
        camper_id: camperId,
        name: name.trim(),
        logo_url: logo,
        color,
      });
      if (result?.success) {
        toast.success("Team design saved! 🎨");
        onDone();
      } else {
        toast.error(result?.message ?? "Failed to save design");
      }
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Error: " + message);
    }
  };

  const usedColorsLower = usedColors.map(c => c.toLowerCase());

  return (
    <div className="bg-white/90 rounded-lg border border-border p-4 mb-3 flex flex-col gap-3">
      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">Team Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-2 py-1.5 border border-border rounded text-sm bg-background"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-foreground mb-1 block">Team Color</label>
        <div className="flex flex-wrap gap-1">
          {NATURE_PALETTE.map((c) => {
            const taken = usedColorsLower.includes(c.toLowerCase()) && c.toLowerCase() !== currentColor?.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                disabled={taken}
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
        <label className="text-xs font-medium text-foreground mb-1 block">Team Logo</label>
        <ImageUpload
          value={logo}
          onChange={setLogo}
          label=""
          hint="Upload logo"
          shape="square"
          maxSizeMB={2}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs border border-border rounded hover:bg-muted">Cancel</button>
        <button onClick={handleSave} disabled={loading} className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:opacity-90 disabled:opacity-50">
          {loading ? "Saving..." : "Save Design"}
        </button>
      </div>
    </div>
  );
}
