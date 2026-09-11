import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { useApiData } from "@/hooks/useApiData";

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

type Props = {
  teams: Team[];
};

export default function CampVPLeaderboard({ teams }: Props) {
  // Get Top Dealer (dynamic W&D leader)
  const { data: wdData } = useApiData("GetWheelLeaderboard", {}, { staleTime: 30_000 });
  const topDealerId = (wdData?.leaders ?? [])[0]?.camper_id ?? null;

  // Flatten all members with team info, sorted by individual points
  const rankedCampers = useMemo(() => {
    const all: Array<{
      camperId: number;
      firstName: string;
      lastName: string;
      photoUrl: string | null;
      points: number;
      teamName: string;
      teamLogoUrl: string | null;
      teamColor: string;
    }> = [];

    for (const team of teams) {
      for (const m of team.members) {
        all.push({
          camperId: m.id,
          firstName: m.first_name,
          lastName: m.last_name,
          photoUrl: m.photo_url,
          points: m.points,
          teamName: team.name,
          teamLogoUrl: team.logo_url,
          teamColor: team.color || "#2d6a4f",
        });
      }
    }

    all.sort((a, b) => b.points - a.points);
    return all;
  }, [teams]);

  if (rankedCampers.length === 0) return null;

  const topCamper = rankedCampers[0];

  return (
    <div className="border-2 border-purple-200 rounded-xl overflow-hidden bg-gradient-to-b from-purple-50/50 to-background">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-purple-700 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <h3 className="text-white font-bold text-lg">cAMP-V-P Leaderboard</h3>
            <p className="text-purple-200 text-xs">Individual XP race — who will be the Most Valuable cAMPer?</p>
          </div>
        </div>
        {topCamper && topCamper.points > 0 && (
          <Badge className="bg-yellow-400 text-yellow-900 font-bold text-sm px-3 py-1 shadow animate-pulse">
            👑 {topCamper.firstName} {topCamper.lastName.charAt(0)}. — {topCamper.points} pts
          </Badge>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-purple-200/50 bg-purple-50/50">
              <th className="text-center px-3 py-2.5 font-bold text-purple-700 w-16">Rank</th>
              <th className="text-left px-3 py-2.5 font-bold text-purple-700">cAMPer</th>
              <th className="text-left px-3 py-2.5 font-bold text-purple-700">Team</th>
              <th className="text-center px-3 py-2.5 font-bold text-purple-700">XP</th>
              <th className="text-center px-3 py-2.5 font-bold text-purple-700 w-28">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {rankedCampers.map((camper, idx) => {
              const rank = idx + 1;
              const isFirst = rank === 1 && camper.points > 0;
              const isSecond = rank === 2 && camper.points > 0;
              const isThird = rank === 3 && camper.points > 0;
              const isTop3 = isFirst || isSecond || isThird;

              return (
                <tr
                  key={camper.camperId}
                  className={`transition-colors ${
                    isFirst ? "bg-yellow-50/80 hover:bg-yellow-100/60" :
                    isSecond ? "bg-gray-50/50 hover:bg-gray-100/40" :
                    isThird ? "bg-orange-50/50 hover:bg-orange-100/40" :
                    "hover:bg-muted/30"
                  }`}
                >
                  {/* Rank */}
                  <td className="text-center px-3 py-3">
                    {isFirst ? (
                      <span className="text-2xl">🥇</span>
                    ) : isSecond ? (
                      <span className="text-2xl">🥈</span>
                    ) : isThird ? (
                      <span className="text-2xl">🥉</span>
                    ) : (
                      <span className="text-sm font-mono text-muted-foreground font-bold">#{rank}</span>
                    )}
                  </td>

                  {/* Camper */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      {camper.photoUrl ? (
                        <img src={camper.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-bold">
                          {camper.firstName.charAt(0)}{camper.lastName.charAt(0)}
                        </div>
                      )}
                      <span className={`font-medium ${isFirst ? "text-foreground font-bold" : "text-foreground"}`}>
                        {camper.firstName} {camper.lastName}
                      </span>
                      {camper.camperId === topDealerId && (
                        <Badge className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[9px] font-bold px-1.5 py-0 ml-1">
                          🎡 Top Dealer
                        </Badge>
                      )}
                    </div>
                  </td>

                  {/* Team with logo */}
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      {camper.teamLogoUrl ? (
                        <img src={camper.teamLogoUrl} alt="" className="w-6 h-6 rounded-full object-cover" />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: camper.teamColor }}
                        >
                          {camper.teamName.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="text-muted-foreground text-xs">{camper.teamName}</span>
                    </div>
                  </td>

                  {/* XP */}
                  <td className="text-center px-3 py-3">
                    <span className={`font-bold ${isFirst ? "text-xl text-yellow-600" : isTop3 ? "text-lg text-foreground" : "text-foreground"}`}>
                      {camper.points}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="text-center px-3 py-3">
                    {isFirst && camper.points > 0 && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-amber-500 text-yellow-900 text-[10px] font-bold px-2 py-0.5 shadow-sm animate-pulse">
                        👑 cAMP-V-P
                      </Badge>
                    )}
                    {isSecond && camper.points > 0 && (
                      <Badge variant="outline" className="text-[10px] border-purple-300 text-purple-700 bg-purple-50">
                        🎯 Contender
                      </Badge>
                    )}
                    {isThird && camper.points > 0 && (
                      <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700 bg-orange-50">
                        🔥 Hot Streak
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-purple-50/30 border-t border-purple-200/30 text-center">
        <p className="text-xs text-muted-foreground">
          👑 The <strong>cAMP-V-P</strong> is the individual with the most XP across all teams — defend the crown or take it!
        </p>
      </div>
    </div>
  );
}
