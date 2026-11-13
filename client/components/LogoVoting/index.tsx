import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import LogoVoteTile, { type LogoVoteTeam } from "@/components/LogoVoteTile/index.js";
import LogoVoteCounselorBar from "@/components/LogoVoteCounselorBar/index.js";
import { errorMessage } from "@/lib/cohortRefresh";

type LogoVotingProps = {
  teams: LogoVoteTeam[];
  camperId: number;
  myTeamId: number | null;
  /** Counselors always see the card, with lock/unlock and close controls. */
  isCounselor: boolean;
};

export default function LogoVoting({ teams, camperId, myTeamId, isCounselor }: LogoVotingProps) {
  // Poll while voting is live so the tally updates for everyone.
  const { data, loading, fetching, refetch } = useApiData(
    "GetTeamVotes",
    { camper_id: camperId },
    { enabled: camperId > 0, refetchInterval: 20_000 },
  );
  const { run: submitVote, loading: voting } = useApi("SubmitTeamVote");

  const votingOpen = data?.votingOpen ?? false;
  const finalized = data?.finalized ?? false;
  const myVote = data?.myVote ?? null;
  const totalVoters = data?.totalVoters ?? 0;
  const totalCampers = data?.totalCampers ?? 0;
  const bestLogoIds = useMemo(() => new Set(data?.bestLogoTeamIds ?? []), [data?.bestLogoTeamIds]);

  const voteCounts = useMemo(() => {
    const map: Record<number, number> = {};
    for (const v of data?.votes ?? []) map[v.team_id] = v.vote_count;
    return map;
  }, [data?.votes]);

  const sortedTeams = useMemo(
    () => [...teams].sort((a, b) => (voteCounts[b.id] ?? 0) - (voteCounts[a.id] ?? 0)),
    [teams, voteCounts],
  );

  // Final places (ties share a place) once voting is closed.
  const places = useMemo(() => {
    const map: Record<number, number> = {};
    let place = 0;
    let last: number | null = null;
    for (const t of sortedTeams) {
      const c = voteCounts[t.id] ?? 0;
      if (c === 0) continue;
      if (c !== last) {
        place += 1;
        last = c;
      }
      map[t.id] = place;
    }
    return map;
  }, [sortedTeams, voteCounts]);

  const totalVotes = useMemo(() => Object.values(voteCounts).reduce((a, b) => a + b, 0), [voteCounts]);

  const handleVote = useCallback(
    async (teamId: number) => {
      try {
        const result = await submitVote({ camper_id: camperId, team_id: teamId });
        if (result?.success) toast.success(result.message);
        else toast.error(result?.message ?? "Could not cast vote");
        await refetch();
      } catch (error) {
        toast.error("Vote failed: " + errorMessage(error));
      }
    },
    [camperId, submitVote, refetch],
  );

  // All hooks above this line, so the card can appear and disappear safely.
  if (loading || !data) return null;
  if (!isCounselor && !votingOpen && !finalized) return null;

  const progressPercent = totalCampers > 0 ? Math.round((totalVoters / totalCampers) * 100) : 0;
  const showResults = finalized || !!myVote || isCounselor;

  const subtitle = finalized
    ? "Voting is closed! Final results below."
    : !votingOpen
      ? "Voting is locked. cAMPers can't see this yet."
      : myVote
        ? "Thanks for voting! Waiting for everyone else…"
        : "Vote for the best team logo (you can't vote for your own team)";

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-amber-900 flex items-center gap-2">🗳️ Logo Vote</h3>
          <p className="text-xs text-amber-700 mt-0.5">{subtitle}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-amber-800">{totalVoters}/{totalCampers} voted</p>
          <div className="w-24 h-2 bg-amber-200 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      {isCounselor && (
        <LogoVoteCounselorBar
          votingOpen={votingOpen}
          finalized={finalized}
          totalVoters={totalVoters}
          totalCampers={totalCampers}
          onChanged={refetch}
        />
      )}

      {fetching && <div className="text-xs text-amber-600">Updating…</div>}

      <div className={`grid grid-cols-2 md:grid-cols-4 gap-3 ${fetching ? "opacity-70" : ""}`}>
        {sortedTeams.map((team) => {
          const voteCount = voteCounts[team.id] ?? 0;
          const isMyTeam = team.id === myTeamId;
          return (
            <LogoVoteTile
              key={team.id}
              team={team}
              voteCount={voteCount}
              votePercent={totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0}
              isMyTeam={isMyTeam}
              isMyVote={myVote === team.id}
              isBestLogo={bestLogoIds.has(team.id)}
              showResults={showResults}
              place={finalized ? places[team.id] ?? null : null}
              disabled={isCounselor || !!myVote || !votingOpen || isMyTeam || voting}
              onVote={() => handleVote(team.id)}
            />
          );
        })}
      </div>

      {finalized && (
        <p className="text-xs text-amber-700 text-center border-t border-amber-200 pt-3">
          🏆 Team points awarded: 1st +20 · 2nd +15 · 3rd +10 · 4th +5 · Best Logo goes on the Legacy Wall
        </p>
      )}
    </div>
  );
}
