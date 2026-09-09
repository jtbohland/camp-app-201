import { useNavigate } from "react-router";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

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
  members: TeamMember[];
  total_points: number;
};

type TeamCardProps = {
  team: Team;
  isAdmin: boolean;
  currentCamperId: number | undefined;
  onAssignMembers: () => void;
  rank: number;
  totalTeams: number;
};

const RANK_CONFIG: Record<number, { banner: string; bg: string; border: string; glow: string; emoji: string; label: string }> = {
  1: { banner: "bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500", bg: "bg-yellow-50", border: "border-yellow-300 ring-2 ring-yellow-300/50", glow: "shadow-lg shadow-yellow-200/50", emoji: "🥇", label: "1ST PLACE" },
  2: { banner: "bg-gradient-to-r from-gray-300 via-slate-300 to-gray-400", bg: "bg-gray-50", border: "border-gray-300 ring-1 ring-gray-200", glow: "shadow-md", emoji: "🥈", label: "2ND PLACE" },
  3: { banner: "bg-gradient-to-r from-orange-300 via-amber-300 to-orange-400", bg: "bg-orange-50", border: "border-orange-200 ring-1 ring-orange-200/50", glow: "shadow-md", emoji: "🥉", label: "3RD PLACE" },
};

const DEFAULT_RANK = { banner: "bg-gradient-to-r from-slate-200 to-slate-300", bg: "bg-card", border: "border-border", glow: "", emoji: "", label: "" };

export default function TeamCard({ team, isAdmin, currentCamperId, onAssignMembers, rank, totalTeams }: TeamCardProps) {
  const navigate = useNavigate();
  const isMyTeam = team.members.some((m) => m.id === currentCamperId);
  const canAccessHub = isAdmin || isMyTeam;
  const teamColor = team.color || "#2d6a4f";
  const config = RANK_CONFIG[rank] ?? DEFAULT_RANK;

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
            <p className="text-xs text-muted-foreground italic">No members assigned</p>
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
          {isAdmin && (
            <button
              onClick={onAssignMembers}
              className="px-3 py-2 text-sm font-medium border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
            >
              Assign
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
