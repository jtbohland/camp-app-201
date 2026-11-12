import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import TeamLogoBadge from "@/components/TeamLogoBadge/index.js";
import TeamDesignEditor from "@/components/TeamDesignEditor/index.js";
import TeamMemberPill from "@/components/TeamMemberPill/index.js";

type TeamMember = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  points: number;
  photo_url: string | null;
  role: string | null;
  country: string | null;
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

type EditorMode = "none" | "design" | "demo";

export default function TeamCard({ team, isAdmin, currentCamperId, rank, usedColors = [], onRefresh }: TeamCardProps) {
  const navigate = useNavigate();
  const isMyTeam = team.members.some((m) => m.id === currentCamperId);
  const canAccessHub = isAdmin || isMyTeam;
  const config = RANK_CONFIG[rank] ?? DEFAULT_RANK;

  // Team members design their own team until it has both a logo and a color.
  const needsDesign = isMyTeam && (!team.logo_url || !team.color);
  // Counselors (not on the team) get a no-save walkthrough on every tile, anytime.
  const canDemo = isAdmin && !isMyTeam;
  const [editor, setEditor] = useState<EditorMode>("none");

  // Pills always run from most points to fewest (ties alphabetical).
  const rankedMembers = useMemo(
    () => [...team.members].sort((a, b) => b.points - a.points || a.first_name.localeCompare(b.first_name)),
    [team.members]
  );
  const topScorer = rankedMembers[0] ?? null;

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
          <TeamLogoBadge src={team.logo_url} name={team.name} color={team.color} />
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
          {rankedMembers.map((member) => (
            <TeamMemberPill
              key={member.id}
              firstName={member.first_name}
              lastName={member.last_name}
              points={member.points}
              role={member.role}
              country={member.country}
              isMe={member.id === currentCamperId}
            />
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

        {/* Design prompt for team members */}
        {needsDesign && editor === "none" && (
          <div className="mb-3 flex flex-col gap-1.5">
            <button
              onClick={() => setEditor("design")}
              className="px-3 py-2 text-sm font-medium rounded-lg border-2 border-dashed border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors flex items-center gap-2"
            >
              <Icon icon="palette" className="w-4 h-4" />
              Design Your Team — Add a name, logo & color!
            </button>
            <p className="text-[10px] text-amber-600/70 px-1 leading-tight">
              💡 Pick one teammate to type the name, add the logo & save — collaborate on the design together, but only one person should submit to avoid conflicts.
            </p>
          </div>
        )}

        {/* Counselor walkthrough */}
        {canDemo && editor === "none" && (
          <button
            onClick={() => setEditor("demo")}
            className="mb-3 px-3 py-1.5 text-xs font-medium rounded-lg border border-sky-300 bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors flex items-center justify-center gap-1.5"
          >
            <Icon icon="presentation" className="w-3.5 h-3.5" />
            Preview Design Steps
          </button>
        )}

        {editor !== "none" && (
          <TeamDesignEditor
            teamId={team.id}
            camperId={currentCamperId ?? 0}
            currentName={team.name}
            currentColor={team.color}
            currentLogo={team.logo_url}
            usedColors={usedColors}
            demo={editor === "demo"}
            onDone={() => { setEditor("none"); onRefresh?.(); }}
            onCancel={() => setEditor("none")}
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
