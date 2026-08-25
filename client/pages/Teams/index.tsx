import { useState, useCallback } from "react";
import { useApiData } from "@/hooks/useApiData.js";
import { useApi } from "@/hooks/useApi.js";
import { useSuperblocksUser } from "@superblocksteam/library";
import { toast } from "sonner";
import CreateTeamDialog from "@/components/CreateTeamDialog/index.js";
import TeamCard from "@/components/TeamCard/index.js";
import AssignMembersDialog from "@/components/AssignMembersDialog/index.js";
import HubActivityTable from "@/components/HubActivityTable/index.js";

export default function TeamsPage() {
  const user = useSuperblocksUser();
  const { data: camperData, loading: camperLoading } = useApiData("GetCurrentCamper", { email: user?.email ?? "" });
  const { data: teamsData, loading: teamsLoading, fetching, refetch: refetchTeams } = useApiData("GetTeams", {});

  const [showCreate, setShowCreate] = useState(false);
  const [assignTeamId, setAssignTeamId] = useState<number | null>(null);

  const isAdmin = camperData?.camper?.role === "counselor" || camperData?.camper?.role === "admin";
  const loading = camperLoading || teamsLoading;

  if (loading) {
    return (
      <div className="flex flex-col gap-6 p-6 w-full animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 w-full overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? "Manage team assignments and track collaboration" : "Your team and fellow cAMPers"}
          </p>
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
