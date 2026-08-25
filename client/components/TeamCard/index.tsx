import { useNavigate } from "react-router";

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
};

export default function TeamCard({ team, isAdmin, currentCamperId, onAssignMembers }: TeamCardProps) {
  const navigate = useNavigate();
  const isMyTeam = team.members.some((m) => m.id === currentCamperId);
  const canAccessHub = isAdmin || isMyTeam;
  const teamColor = team.color || "#2d6a4f";

  return (
    <div
      className="rounded-lg border border-border bg-card overflow-hidden flex flex-col"
      style={{ borderTopColor: teamColor, borderTopWidth: "3px" }}
    >
      {/* Header */}
      <div className="p-4 flex items-center gap-3">
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name} className="w-10 h-10 rounded-full object-cover" />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: teamColor }}
          >
            {team.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{team.name}</h3>
          <p className="text-xs text-muted-foreground">{team.members.length} member{team.members.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold" style={{ color: teamColor }}>{team.total_points}</p>
          <p className="text-xs text-muted-foreground">pts</p>
        </div>
      </div>

      {/* Members list */}
      <div className="px-4 pb-3 flex-1">
        {team.members.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {team.members.map((member) => (
              <span
                key={member.id}
                className={`text-xs px-2 py-0.5 rounded-full ${
                  member.id === currentCamperId
                    ? "bg-primary/20 text-primary font-medium"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {member.first_name} {member.last_name.charAt(0)}.
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No members assigned</p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        {canAccessHub && (
          <button
            onClick={() => navigate(`/teams/${team.id}`)}
            className="flex-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity"
          >
            Open Hub
          </button>
        )}
        {isAdmin && (
          <button
            onClick={onAssignMembers}
            className="px-3 py-1.5 text-xs font-medium border border-border text-foreground rounded hover:bg-muted transition-colors"
          >
            Assign
          </button>
        )}
      </div>

      {isMyTeam && (
        <div className="px-4 pb-2">
          <span className="text-xs font-medium text-primary">⛺ Your Team</span>
        </div>
      )}
    </div>
  );
}
