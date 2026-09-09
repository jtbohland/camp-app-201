import { useState, useMemo, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import CreateTeamDialog from "@/components/CreateTeamDialog/index.js";
import TeamCard from "@/components/TeamCard/index.js";
import AssignMembersDialog from "@/components/AssignMembersDialog/index.js";
import CampVPLeaderboard from "@/components/CampVPLeaderboard/index.js";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamsTab() {
  const user = useSuperblocksUser();
  const { data: camperData, loading: camperLoading } = useApiData("GetCurrentCamper", { email: user?.email ?? "" });
  const { data: teamsData, loading: teamsLoading, fetching, refetch: refetchTeams } = useApiData("GetTeams", {});

  const [showCreate, setShowCreate] = useState(false);
  const [assignTeamId, setAssignTeamId] = useState<number | null>(null);

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";
  const loading = camperLoading || teamsLoading;

  // Sort teams by total_points descending for ranking
  const rankedTeams = useMemo(() => {
    const teams = [...(teamsData?.teams ?? [])];
    return teams.sort((a, b) => b.total_points - a.total_points);
  }, [teamsData]);

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
          <p className="text-sm font-semibold text-foreground">
            {rankedTeams.length} team{rankedTeams.length !== 1 ? "s" : ""} competing
          </p>
          <p className="text-xs text-muted-foreground">Ranked by total XP · Updated live</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
          >
            + Create Team
          </button>
        )}
      </div>

      {fetching && !loading && (
        <div className="text-xs text-muted-foreground">Updating…</div>
      )}

      {/* Ranked Teams Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 gap-5 ${fetching && !loading ? "opacity-70" : ""}`}>
        {rankedTeams.map((team, idx) => (
          <TeamCard
            key={team.id}
            team={team}
            isAdmin={isAdmin}
            currentCamperId={camperData?.camper?.id}
            onAssignMembers={() => setAssignTeamId(team.id)}
            rank={idx + 1}
            totalTeams={rankedTeams.length}
          />
        ))}
        {rankedTeams.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p className="text-lg">No teams created yet</p>
            {isAdmin && <p className="text-sm mt-1">Create a team to get started</p>}
          </div>
        )}
      </div>

      {/* cAMP-V-P Individual Leaderboard */}
      <CampVPLeaderboard />

      {/* Dialogs */}
      {showCreate && (
        <CreateTeamDialog
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refetchTeams();
          }}
        />
      )}
      {assignTeamId !== null && (
        <AssignMembersDialog
          teamId={assignTeamId}
          onClose={() => setAssignTeamId(null)}
          onAssigned={() => {
            setAssignTeamId(null);
            refetchTeams();
          }}
        />
      )}
    </div>
  );
}
