import { useState, useCallback, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

type Team = {
  id: number;
  name: string;
  logo_url?: string | null;
  color: string | null;
  total_points?: number;
};

type LogoVotingProps = {
  teams: Team[];
  camperId: number;
  myTeamId: number | null;
};

export default function LogoVoting({ teams, camperId, myTeamId }: LogoVotingProps) {
  const { data, loading, fetching, refetch } = useApiData("GetTeamVotes", {
    camper_id: camperId,
  }, { enabled: camperId > 0 });

  const { run: submitVote, loading: voting } = useApi("SubmitTeamVote");
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);

  const votingOpen = data?.votingOpen ?? false;
  const myVote = data?.myVote ?? null;
  const totalVoters = data?.totalVoters ?? 0;
  const totalCampers = data?.totalCampers ?? 0;
  const voteCounts: Record<number, number> = useMemo(() => {
    const map: Record<number, number> = {};
    for (const v of data?.votes ?? []) {
      map[v.team_id] = v.vote_count;
    }
    return map;
  }, [data?.votes]);

  const allVotedIn = totalCampers > 0 && totalVoters >= totalCampers;

  const handleVote = useCallback(async (teamId: number) => {
    try {
      const result = await submitVote({ camper_id: camperId, team_id: teamId });
      if (result?.success) {
        toast.success(result.message);
        refetch();
      } else {
        toast.error(result?.message ?? "Could not cast vote");
      }
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message) : String(error);
      toast.error("Vote failed: " + message);
    }
  }, [camperId, submitVote, refetch]);

  if (!votingOpen && !allVotedIn) return null;
  if (loading) return null;

  // Sort teams by votes for display
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0));
  }, [teams, voteCounts]);

  const totalVotes = Object.values(voteCounts).reduce((a, b) => a + b, 0);
  const progressPercent = totalCampers > 0 ? Math.round((totalVoters / totalCampers) * 100) : 0;

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">
            🗳️ Logo Vote
          </h3>
          <p className="text-xs text-amber-700 mt-0.5">
            {allVotedIn
              ? "All votes are in! Results below."
              : myVote
                ? "Thanks for voting! Waiting for everyone else…"
                : "Vote for the best team logo (you can't vote for your own team)"
            }
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-amber-800">{totalVoters}/{totalCampers} voted</p>
          <div className="w-24 h-2 bg-amber-200 rounded-full mt-1 overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {fetching && <div className="text-xs text-amber-600 mb-2">Updating…</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {sortedTeams.map((team) => {
          const isMyTeam = team.id === myTeamId;
          const isVoted = myVote === team.id;
          const voteCount = voteCounts[team.id] ?? 0;
          const votePercent = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;

          // Ranking for finished voting
          const rank = allVotedIn ? sortedTeams.indexOf(team) + 1 : null;
          const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

          return (
            <button
              key={team.id}
              type="button"
              disabled={!!myVote || !votingOpen || isMyTeam || voting}
              onClick={() => {
                if (!myVote && !isMyTeam) {
                  setSelectedTeam(team.id);
                  handleVote(team.id);
                }
              }}
              className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                isVoted
                  ? "border-amber-500 bg-amber-100 ring-2 ring-amber-300"
                  : isMyTeam
                    ? "border-border bg-muted/50 opacity-60 cursor-not-allowed"
                    : myVote
                      ? "border-border bg-white cursor-default"
                      : "border-border bg-white hover:border-amber-400 hover:shadow-md cursor-pointer"
              }`}
            >
              {rankEmoji && (
                <span className="absolute -top-2 -right-2 text-lg">{rankEmoji}</span>
              )}

              {/* Logo */}
              <div
                className="w-14 h-14 rounded-full border-2 flex items-center justify-center overflow-hidden"
                style={{ borderColor: team.color ?? '#666' }}
              >
                {team.logo_url ? (
                  <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-2xl">🏕️</span>
                )}
              </div>

              <span className="text-xs font-semibold text-foreground text-center leading-tight">{team.name}</span>

              {/* Vote count / bar (visible after voting or when results show) */}
              {(myVote || allVotedIn) && (
                <div className="w-full">
                  <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                    <span>{voteCount} vote{voteCount !== 1 ? "s" : ""}</span>
                    <span>{votePercent}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${votePercent}%`, backgroundColor: team.color ?? '#666' }}
                    />
                  </div>
                </div>
              )}

              {isMyTeam && !myVote && (
                <span className="text-[10px] text-muted-foreground italic">Your team</span>
              )}
              {isVoted && (
                <span className="text-[10px] text-amber-700 font-medium flex items-center gap-0.5">
                  <Icon icon="check-circle" className="w-3 h-3" />
                  Your vote
                </span>
              )}
            </button>
          );
        })}
      </div>

      {allVotedIn && (
        <div className="mt-4 pt-3 border-t border-amber-200">
          <p className="text-xs text-amber-700 text-center">
            🏆 Points awarded: 1st +20 · 2nd +15 · 3rd +10 · 4th +5
          </p>
        </div>
      )}
    </div>
  );
}
