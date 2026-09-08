import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import CreateTeamDialog from "@/components/CreateTeamDialog/index.js";
import TeamCard from "@/components/TeamCard/index.js";
import AssignMembersDialog from "@/components/AssignMembersDialog/index.js";
import HubActivityTable from "@/components/HubActivityTable/index.js";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamsTab() {
  const user = useSuperblocksUser();
  const { data: camperData, loading: camperLoading } = useApiData("GetCurrentCamper", { email: user?.email ?? "" });
  const { data: teamsData, loading: teamsLoading, fetching, refetch: refetchTeams } = useApiData("GetTeams", {});

  const [showCreate, setShowCreate] = useState(false);
  const [assignTeamId, setAssignTeamId] = useState<number | null>(null);

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";
  const loading = camperLoading || teamsLoading;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 w-full animate-pulse">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {teamsData?.teams?.length ?? 0} team{(teamsData?.teams?.length ?? 0) !== 1 ? "s" : ""} active
        </p>
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

      {/* Teams Grid */}
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${fetching && !loading ? "opacity-70" : ""}`}>
        {teamsData?.teams?.map((team) => (
          <TeamCard
            key={team.id}
            team={team}
            isAdmin={isAdmin}
            currentCamperId={camperData?.camper?.id}
            onAssignMembers={() => setAssignTeamId(team.id)}
          />
        ))}
        {teamsData?.teams?.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p className="text-lg">No teams created yet</p>
            {isAdmin && <p className="text-sm mt-1">Create a team to get started</p>}
          </div>
        )}
      </div>

      {/* Admin: Hub Activity tracking */}
      {isAdmin && (
        <div className="mt-4">
          <HubActivityTable />
        </div>
      )}

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
