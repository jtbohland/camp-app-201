import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import AdminTeamTable from "@/components/AdminTeamTable/index.js";
import AdminTeamHeader from "@/components/AdminTeamHeader/index.js";
import { refreshTeamData } from "@/lib/teamMoves.js";
import { errorMessage } from "@/lib/cohortRefresh.js";

interface Props {
  cohortId: number | null;
  canEdit: boolean;
  onCamperClick: (camperId: number) => void;
}

type CampersData = { campers: Array<{ id: number; team_id: number | null; team_name: string | null }> };

export default function AdminTeamView({ cohortId, canEdit, onCamperClick }: Props) {
  const teamInputs = { cohort_id: cohortId };
  const camperInputs = { cohort_id: cohortId };
  const { data: teamsData, loading, fetching: teamsFetching } = useApiData("GetAdminTeams", teamInputs);
  const { data: campersData, fetching: campersFetching } = useApiData("GetAdminCampers", camperInputs);
  const { run: assignMembers } = useApi("AssignTeamMembers");

  const teams = teamsData?.teams ?? [];
  const campers = campersData?.campers ?? [];
  const teamOptions = useMemo(
    () => [...teams].sort((a, b) => a.name.localeCompare(b.name)).map((t) => ({ id: t.id, name: t.name })),
    [teams],
  );
  const byTeam = useMemo(() => {
    const map = new Map<number | null, typeof campers>();
    for (const c of campers) {
      const key = c.team_id ?? null;
      map.set(key, [...(map.get(key) ?? []), c]);
    }
    return map;
  }, [campers]);
  const unassigned = byTeam.get(null) ?? [];

  const handleMove = useCallback(
    async (camperId: number, teamId: number | null) => {
      const camper = campers.find((c) => c.id === camperId);
      if (!camper || camper.team_id === teamId) return;
      const target = teams.find((t) => t.id === teamId);

      // Move the row right away, then save and refresh every team screen.
      const cacheKey = queryClient.buildCacheKey("GetAdminCampers", camperInputs);
      const previous = queryClient.getQueryData<CampersData>(cacheKey);
      if (previous) {
        queryClient.setQueryData<CampersData>(cacheKey, {
          ...previous,
          campers: previous.campers.map((c) =>
            c.id === camperId ? { ...c, team_id: teamId, team_name: target?.name ?? null } : c,
          ),
        });
      }
      try {
        const result = await assignMembers({ team_id: teamId, camper_ids: [camperId] });
        if (!result?.assigned) throw new Error("That cAMPer couldn't be moved.");
        toast.success(`${camper.first_name} moved to ${target?.name ?? "Unassigned"}`);
      } catch (error) {
        if (previous) queryClient.setQueryData<CampersData>(cacheKey, previous);
        toast.error("Couldn't move " + camper.first_name + ": " + errorMessage(error));
      } finally {
        await refreshTeamData();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [campers, teams, assignMembers, cohortId],
  );

  if (loading) {
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-xl" />
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Icon icon="flag" className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="text-lg">No teams in this cohort yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {canEdit
            ? "Drag a cAMPer onto another team, or use Move to. Changes show in the app right away."
            : "Viewing a past cohort — teams are read-only."}
        </p>
        {(teamsFetching || campersFetching) && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Icon icon="loader-circle" className="w-3 h-3 animate-spin" /> Updating…
          </span>
        )}
      </div>

      <div className={`grid grid-cols-1 xl:grid-cols-2 gap-6 ${teamsFetching ? "opacity-90" : ""}`}>
        {teams.map((team, index) => {
          const members = byTeam.get(team.id) ?? [];
          return (
            <AdminTeamTable
              key={team.id}
              header={
                <AdminTeamHeader
                  rank={index + 1}
                  name={team.name}
                  company={team.assigned_company}
                  memberCount={members.length}
                  totalPoints={team.total_points}
                  avgPoints={team.avg_points}
                  checkinRate={team.checkin_rate}
                />
              }
              members={members}
              teams={teamOptions}
              dropTeamId={team.id}
              canEdit={canEdit}
              emptyText={canEdit ? "No members — drag cAMPers here" : "No members assigned"}
              onOpen={onCamperClick}
              onMove={handleMove}
            />
          );
        })}
      </div>

      {(unassigned.length > 0 || canEdit) && (
        <AdminTeamTable
          header={
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="user-x" className="w-4 h-4 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Not on a team</h3>
              <span className="text-xs text-muted-foreground">({unassigned.length})</span>
            </div>
          }
          members={unassigned}
          teams={teamOptions}
          dropTeamId={null}
          canEdit={canEdit}
          emptyText={canEdit ? "Everyone is on a team. Drag someone here to take them off their team." : "Everyone is on a team."}
          onOpen={onCamperClick}
          onMove={handleMove}
        />
      )}
    </div>
  );
}
