import { useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";

export default function LeaderboardPage() {
  const { data, loading, fetching } = useApiData("GetLeaderboard", {});

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 w-full animate-pulse">
        <div className="h-8 w-56 bg-muted rounded" />
        <div className="h-48 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  const teams = data?.teams ?? [];
  const topContributors = data?.topContributors ?? [];
  const mvp = data?.mvp;

  return (
    <div className="flex flex-col gap-6 p-6 w-full overflow-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Leaderboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Team rankings and top performers</p>
      </div>

      {fetching && !loading && (
        <div className="text-xs text-muted-foreground">Updating…</div>
      )}

      <div className={fetching && !loading ? "opacity-70" : ""}>
        {/* aMpVP Spotlight */}
        {mvp && (
          <div className="mb-6 bg-gradient-to-r from-amber-900/20 to-yellow-900/20 border border-amber-700/30 rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-amber-600 flex items-center justify-center text-white shrink-0">
                <span className="text-2xl">🏆</span>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-amber-400 uppercase tracking-wider">aMpVP of cAMP</p>
                <p className="text-xl font-bold text-foreground mt-0.5">
                  {mvp.first_name} {mvp.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{mvp.points} points earned</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-amber-400">{mvp.points}</p>
                <p className="text-xs text-muted-foreground">total pts</p>
              </div>
            </div>
          </div>
        )}

        {/* Team Leaderboard */}
        <div className="border border-border rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-3 bg-muted/30 border-b border-border">
            <h2 className="font-semibold text-foreground">Team Rankings</h2>
          </div>
          <div className="divide-y divide-border">
            {teams.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No teams yet</div>
            ) : (
              teams.map((team, index) => (
                <TeamRow key={team.id} team={team} rank={index + 1} />
              ))
            )}
          </div>
        </div>

        {/* Top Contributors per Team */}
        {topContributors.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-muted/30 border-b border-border">
              <h2 className="font-semibold text-foreground">Top Contributors by Team</h2>
              <p className="text-xs text-muted-foreground mt-0.5">The highest point earner on each team</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {topContributors.map(({ team_id, team_name, contributor }) => (
                <div key={team_id} className="border border-border rounded-lg p-4 bg-card">
                  <p className="text-xs text-muted-foreground font-medium mb-2">{team_name}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                      {contributor.first_name.charAt(0)}{contributor.last_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {contributor.first_name} {contributor.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{contributor.points} pts</p>
                    </div>
                    <span className="text-lg">⭐</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type TeamRowProps = {
  team: {
    id: number;
    name: string;
    logo_url: string | null;
    color: string | null;
    total_points: number;
    member_count: number;
  };
  rank: number;
};

function TeamRow({ team, rank }: TeamRowProps) {
  const rankIcon = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const teamColor = team.color || "#2d6a4f";

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
      <span className="text-lg w-8 text-center shrink-0">
        {typeof rankIcon === "string" && rankIcon.startsWith("#") ? (
          <span className="text-sm text-muted-foreground font-mono">{rankIcon}</span>
        ) : (
          rankIcon
        )}
      </span>

      {team.logo_url ? (
        <img src={team.logo_url} alt={team.name} className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: teamColor }}
        >
          {team.name.slice(0, 2).toUpperCase()}
        </div>
      )}

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground">{team.name}</h3>
        <p className="text-xs text-muted-foreground">{team.member_count} member{team.member_count !== 1 ? "s" : ""}</p>
      </div>

      <div className="text-right">
        <p className="text-xl font-bold" style={{ color: teamColor }}>{team.total_points}</p>
        <p className="text-xs text-muted-foreground">points</p>
      </div>
    </div>
  );
}
