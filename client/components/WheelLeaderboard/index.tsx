import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import WheelLeaderRow, { type WheelLeader } from "./WheelLeaderRow.js";

/** Dense places on the ranking key (gap, then points, then pitches): ties share a place. */
function places(leaders: WheelLeader[]): number[] {
  let place = 0;
  let last = "";
  return leaders.map((l) => {
    const key = `${l.avg_delta ?? "x"}|${l.total_points}|${l.pitch_count}`;
    if (key !== last) {
      place += 1;
      last = key;
    }
    return place;
  });
}

export default function WheelLeaderboard() {
  const { data, loading, fetching } = useApiData("GetWheelLeaderboard", {}, { staleTime: 15_000 });
  const leaders: WheelLeader[] = data?.leaders ?? [];

  if (loading) return <Skeleton className="h-48 rounded-xl" />;
  if (leaders.length === 0) {
    return (
      <div className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center bg-blue-50/30">
        <div className="text-4xl mb-2">🎡</div>
        <h3 className="text-base font-bold text-foreground mb-1">Pitch Leaderboard</h3>
        <p className="text-sm text-muted-foreground">No pitches yet — who will be the first Wheel Dealer?</p>
      </div>
    );
  }

  const ranks = places(leaders);
  const top = leaders[0];

  return (
    <div className="border-2 border-blue-200 rounded-xl overflow-hidden bg-gradient-to-b from-blue-50/50 to-background">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-5 py-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎡</span>
          <div>
            <h3 className="text-white font-bold text-lg">Wheel & Deal Leaderboard</h3>
            <p className="text-blue-200 text-xs">Ranked by self-awareness: the smallest gap between your self-score and the room wins.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {fetching && <span className="text-[10px] text-blue-100">Updating…</span>}
          {top && top.avg_delta !== null && (
            <Badge className="bg-yellow-400 text-yellow-900 font-bold text-sm px-3 py-1 shadow">
              🎯 {top.first_name} {top.last_name.charAt(0)}. — {top.avg_delta} gap
            </Badge>
          )}
        </div>
      </div>

      <div className={`overflow-x-auto ${fetching ? "opacity-70" : ""}`}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-blue-200/50 bg-blue-50/50">
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-16">Rank</th>
              <th className="text-left px-3 py-2.5 font-bold text-blue-700">Pitcher</th>
              <th className="text-left px-3 py-2.5 font-bold text-blue-700">Team</th>
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-16">Spins</th>
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-20">Self</th>
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-20">Room</th>
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-20">Gap</th>
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-16">Pts</th>
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-28">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {leaders.map((l, idx) => (
              <WheelLeaderRow key={l.camper_id} leader={l} rank={ranks[idx]} />
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 bg-blue-50/30 border-t border-blue-200/30 text-center">
        <p className="text-xs text-muted-foreground">
          🎯 The <strong>Top Dealer</strong> knows their pitch best: smallest gap between self-score and room average. Ties go to more points.
          Nail it exactly for a <strong>+3 spot-on bonus</strong>.
        </p>
      </div>
    </div>
  );
}
