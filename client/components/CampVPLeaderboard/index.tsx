import { useMemo } from "react";
import { useApiData } from "@/hooks/useApiData";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";

interface LeaderEntry {
  id: number;
  first_name: string;
  last_name: string;
  points: number;
  team_name: string | null;
  team_logo_url: string | null;
  team_color: string | null;
}

export default function CampVPLeaderboard() {
  const { data, loading, fetching } = useApiData("GetLeaderboard", {});

  const allCampers: LeaderEntry[] = useMemo(() => {
    return (data?.campers ?? []) as LeaderEntry[];
  }, [data]);

  const mvpId = allCampers.length > 0 ? allCampers[0].id : null;

  if (loading) {
    return <Skeleton className="h-64" />;
  }

  if (allCampers.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <Icon icon="trophy" className="w-8 h-8 mx-auto mb-2 opacity-40" />
        <p>The cAMP-V-P race begins when teams earn XP!</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-purple-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <h3 className="text-lg font-black tracking-tight">cAMP-V-P Race</h3>
            <p className="text-purple-200 text-xs">Individual XP leaderboard — who's the Most Valuable cAMPer?</p>
          </div>
        </div>
      </div>

      {fetching && !loading && (
        <div className="text-xs text-muted-foreground px-5 pt-2">Updating…</div>
      )}

      {/* MVP Spotlight */}
      {allCampers.length > 0 && (
        <div className="mx-4 mt-4 mb-2 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-xl border border-amber-200 p-4 flex items-center gap-4">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white font-black text-lg shadow-lg">
              {allCampers[0].first_name.charAt(0)}{allCampers[0].last_name.charAt(0)}
            </div>
            <span className="absolute -top-1 -right-1 text-xl">👑</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Badge className="bg-amber-400 text-amber-900 text-[10px] font-black animate-pulse">
                TODAY'S cAMP-V-P
              </Badge>
            </div>
            <p className="text-lg font-black text-foreground mt-0.5">
              {allCampers[0].first_name} {allCampers[0].last_name}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              {allCampers[0].team_logo_url ? (
                <img src={allCampers[0].team_logo_url} alt="" className="w-4 h-4 rounded-full" />
              ) : (
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: allCampers[0].team_color ?? "#2d6a4f" }} />
              )}
              <span className="text-xs text-muted-foreground">{allCampers[0].team_name}</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-3xl font-black text-amber-600">{allCampers[0].points}</p>
            <p className="text-[10px] text-amber-700 font-semibold">XP</p>
          </div>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground w-12">#</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">cAMPer</th>
              <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Team</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">XP</th>
              <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground w-16">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {allCampers.map((camper, idx) => {
              const rank = idx + 1;
              const isMvp = camper.id === mvpId;
              const isTop3 = rank <= 3;
              const rankEmoji = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;

              return (
                <tr
                  key={camper.id}
                  className={`transition-colors ${
                    isMvp ? "bg-amber-50/80" : isTop3 ? "bg-primary/5" : "hover:bg-muted/20"
                  }`}
                >
                  <td className="text-center px-3 py-3">
                    {rankEmoji ? (
                      <span className="text-lg">{rankEmoji}</span>
                    ) : (
                      <span className="text-sm font-mono text-muted-foreground">{rank}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        isMvp ? "bg-amber-400 text-white" : "bg-muted text-foreground/70"
                      }`}>
                        {camper.first_name.charAt(0)}{camper.last_name.charAt(0)}
                      </div>
                      <span className={`font-medium ${isMvp ? "text-amber-800" : "text-foreground"}`}>
                        {camper.first_name} {camper.last_name}
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {camper.team_logo_url ? (
                        <img src={camper.team_logo_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-5 h-5 rounded-full shrink-0"
                          style={{ backgroundColor: camper.team_color ?? "#2d6a4f" }}
                        />
                      )}
                      <span className="text-xs text-muted-foreground">{camper.team_name ?? "Unassigned"}</span>
                    </div>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className={`font-bold ${isMvp ? "text-amber-600 text-base" : isTop3 ? "text-primary" : "text-foreground"}`}>
                      {camper.points}
                    </span>
                  </td>
                  <td className="text-center px-3 py-3">
                    {isMvp && (
                      <Badge className="bg-amber-400 text-amber-900 text-[9px] font-black px-1.5">
                        👑 MVP
                      </Badge>
                    )}
                    {!isMvp && rank <= 3 && (
                      <Badge variant="outline" className="text-[9px] text-purple-600 border-purple-200 bg-purple-50">
                        🔥 Hot
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
