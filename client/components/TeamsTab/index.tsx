import { useState, useCallback, useMemo } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import TeamCard from "@/components/TeamCard/index.js";
import CampVPLeaderboard from "@/components/CampVPLeaderboard/index.js";
import LogoVoting from "@/components/LogoVoting/index.js";
import { Skeleton } from "@/components/ui/skeleton";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";

export default function TeamsTab() {
  const user = useSuperblocksUser();
  const { data: camperData, loading: camperLoading } = useApiData("GetCurrentCamper", { email: user?.email ?? "" });
  const { data: teamsData, loading: teamsLoading, fetching, refetch: refetchTeams } = useApiData("GetTeams", {});

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";
  const camperId = camperData?.camper?.id ?? 0;
  const loading = camperLoading || teamsLoading;

  // Sort teams by total_points descending for ranking
  const rankedTeams = useMemo(() => {
    const teams = [...(teamsData?.teams ?? [])];
    teams.sort((a, b) => (b.total_points ?? 0) - (a.total_points ?? 0));
    return teams;
  }, [teamsData?.teams]);

  // Collect used colors from existing teams for color lockout
  const usedColors = useMemo(() =>
    rankedTeams.map((t: any) => t.color).filter(Boolean),
    [rankedTeams]
  );

  // Camp close + reveal awareness
  const { data: closeStatus } = useApiData("GetCloseCampStatus", {}, { staleTime: 10000 });
  const campClosed = closeStatus?.camp_closed ?? false;
  const revealedTeamIds = new Set(closeStatus?.revealed_team_ids ?? []);

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-56 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 w-full">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {rankedTeams.length} team{rankedTeams.length !== 1 ? "s" : ""} competing
          </p>
        </div>
        {isAdmin && (
          <p className="text-xs text-muted-foreground italic">
            <Icon icon="info" className="w-3 h-3 inline mr-1" />
            Manage teams in Counselor Hub → Cabin
          </p>
        )}
      </div>

      {fetching && !loading && (
        <div className="text-xs text-muted-foreground">Updating…</div>
      )}

      {/* Teams Grid — sorted by points, 2 columns for competitive feel */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${fetching && !loading ? "opacity-70" : ""}`}>
        {rankedTeams.map((team, idx) => {
          const isRevealed = revealedTeamIds.has(team.id);
          const blurred = campClosed && !isRevealed;
          return (
            <div key={team.id} className="relative">
              {blurred && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-md rounded-xl">
                  <div className="text-center p-4">
                    <div className="text-3xl mb-1">🏆</div>
                    <p className="font-semibold text-sm">#{idx + 1} — Awaiting Reveal</p>
                    <p className="text-xs text-muted-foreground">Stay tuned for the podium ceremony!</p>
                  </div>
                </div>
              )}
              <TeamCard
                team={team}
                isAdmin={isAdmin}
                currentCamperId={camperData?.camper?.id}
                rank={idx + 1}
                totalTeams={rankedTeams.length}
                usedColors={usedColors}
                onRefresh={refetchTeams}
              />
            </div>
          );
        })}
        {rankedTeams.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <Icon icon="tent" className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-lg">Teams haven't been created yet</p>
            <p className="text-sm mt-1">Your counselors are preparing teams — check back soon!</p>
          </div>
        )}
      </div>

      {/* Logo Voting — shows when gate is open or results are final */}
      {rankedTeams.length > 0 && camperId > 0 && (
        <LogoVoting
          teams={rankedTeams}
          camperId={camperId}
          myTeamId={camperData?.camper?.team_id ?? null}
        />
      )}

      {/* cAMP-V-P Leaderboard */}
      <CampVPLeaderboard teams={rankedTeams} />
    </div>
  );
}
