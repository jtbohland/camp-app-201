import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";

type Leader = {
  camper_id: number;
  first_name: string;
  last_name: string;
  team_name: string | null;
  team_color: string | null;
  pitch_count: number;
  avg_self_score: number;
  avg_room_score: number;
  total_points: number;
};

export default function WheelLeaderboard() {
  const { data, loading } = useApiData("GetWheelLeaderboard", {}, { staleTime: 15_000 });
  const leaders: Leader[] = data?.leaders ?? [];

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

  const topPitcher = leaders[0];

  return (
    <div className="border-2 border-blue-200 rounded-xl overflow-hidden bg-gradient-to-b from-blue-50/50 to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎡</span>
          <div>
            <h3 className="text-white font-bold text-lg">Wheel & Deal Leaderboard</h3>
            <p className="text-blue-200 text-xs">Who's the boldest pitcher? Step up and spin!</p>
          </div>
        </div>
        {topPitcher && topPitcher.total_points > 0 && (
          <Badge className="bg-yellow-400 text-yellow-900 font-bold text-sm px-3 py-1 shadow animate-pulse">
            🎤 {topPitcher.first_name} {topPitcher.last_name.charAt(0)}. — {topPitcher.total_points} pts
          </Badge>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-blue-200/50 bg-blue-50/50">
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-16">Rank</th>
              <th className="text-left px-3 py-2.5 font-bold text-blue-700">Pitcher</th>
              <th className="text-left px-3 py-2.5 font-bold text-blue-700">Team</th>
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-16">Spins</th>
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-20">Self Avg</th>
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-20">Room Avg</th>
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-16">Pts</th>
              <th className="text-center px-3 py-2.5 font-bold text-blue-700 w-28">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {leaders.map((l, idx) => {
              const rank = idx + 1;
              const isFirst = rank === 1 && l.total_points > 0;
              const isSecond = rank === 2 && l.total_points > 0;
              const isThird = rank === 3 && l.total_points > 0;

              // Self-awareness gap
              const gap = Math.abs(l.avg_self_score - l.avg_room_score);
              const awarenessIcon = gap <= 1 ? "🎯" : gap <= 2 ? "👍" : "🤔";

              return (
                <tr
                  key={l.camper_id}
                  className={`transition-colors ${
                    isFirst ? "bg-yellow-50/80 hover:bg-yellow-100/60" :
                    isSecond ? "bg-gray-50/50 hover:bg-gray-100/40" :
                    isThird ? "bg-orange-50/50 hover:bg-orange-100/40" :
                    "hover:bg-muted/30"
                  }`}
                >
                  {/* Rank */}
                  <td className="text-center px-3 py-3">
                    {isFirst ? <span className="text-2xl">🥇</span> :
                     isSecond ? <span className="text-2xl">🥈</span> :
                     isThird ? <span className="text-2xl">🥉</span> :
                     <span className="text-sm font-mono text-muted-foreground font-bold">#{rank}</span>}
                  </td>

                  {/* Pitcher */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
                        {l.first_name.charAt(0)}{l.last_name.charAt(0)}
                      </div>
                      <span className={`font-medium ${isFirst ? "font-bold" : ""}`}>
                        {l.first_name} {l.last_name}
                      </span>
                    </div>
                  </td>

                  {/* Team */}
                  <td className="px-3 py-3">
                    {l.team_name ? (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: l.team_color || "#6b7280" }}
                        >
                          {l.team_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-muted-foreground text-xs">{l.team_name}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>

                  {/* Spins */}
                  <td className="text-center px-3 py-3">
                    <Badge variant="outline" className="text-xs font-bold px-2">
                      {l.pitch_count}
                    </Badge>
                  </td>

                  {/* Self Avg */}
                  <td className="text-center px-3 py-3">
                    <span className="font-bold text-blue-600">{l.avg_self_score || "—"}</span>
                    <span className="text-[9px] text-muted-foreground">/15</span>
                  </td>

                  {/* Room Avg */}
                  <td className="text-center px-3 py-3">
                    <span className="font-bold text-purple-600">{l.avg_room_score || "—"}</span>
                    <span className="text-[9px] text-muted-foreground">/15</span>
                  </td>

                  {/* Points */}
                  <td className="text-center px-3 py-3">
                    <span className={`font-bold ${isFirst ? "text-xl text-yellow-600" : "text-foreground"}`}>
                      {l.total_points}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="text-center px-3 py-3">
                    {isFirst && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900 text-[10px] font-bold px-2 py-0.5 shadow-sm animate-pulse">
                        🎤 Top Dealer
                      </Badge>
                    )}
                    {isSecond && (
                      <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700 bg-blue-50">
                        {awarenessIcon} Contender
                      </Badge>
                    )}
                    {isThird && (
                      <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 bg-orange-50">
                        🔥 Rising Star
                      </Badge>
                    )}
                    {!isFirst && !isSecond && !isThird && l.pitch_count > 0 && (
                      <span className="text-[10px] text-muted-foreground">{awarenessIcon}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-blue-50/30 border-t border-blue-200/30 text-center">
        <p className="text-xs text-muted-foreground">
          🎡 The <strong>Top Dealer</strong> is the cAMPer with the most Wheel & Deal points — spin bold, pitch strong, know yourself!
        </p>
      </div>
    </div>
  );
}
