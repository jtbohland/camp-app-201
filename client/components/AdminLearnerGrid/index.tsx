import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmRemoveCamperDialog from "@/components/ConfirmRemoveCamperDialog/index.js";
import RemovedCampersList from "@/components/RemovedCampersList/index.js";
import { errorMessage } from "@/lib/cohortRefresh";
import { refreshRosterViews } from "@/lib/camperRemoval";

interface Props {
  cohortId: number | null;
  onCamperClick: (camperId: number) => void;
  /** False while viewing a past cohort (read-only). */
  canEdit: boolean;
}

type CampersData = { campers: Array<{ id: number; points: number }>; total_points: number; total_campers: number };

export default function AdminLearnerGrid({ cohortId, onCamperClick, canEdit }: Props) {
  const inputs = useMemo(() => ({ cohort_id: cohortId }), [cohortId]);
  const { data, loading, fetching } = useApiData("GetAdminCampers", inputs);
  const { run: removeCamper } = useApi("RemoveCamper");
  const [pendingRemove, setPendingRemove] = useState<{ id: number; name: string } | null>(null);

  const handleConfirmRemove = useCallback(async () => {
    if (!pendingRemove) return;
    const { id, name } = pendingRemove;
    setPendingRemove(null);

    // Take the card off the grid right away; put it back if the request fails.
    const cacheKey = queryClient.buildCacheKey("GetAdminCampers", inputs);
    const previous = queryClient.getQueryData<CampersData>(cacheKey);
    if (previous) {
      const removed = previous.campers.find((c) => c.id === id);
      queryClient.setQueryData<CampersData>(cacheKey, {
        ...previous,
        campers: previous.campers.filter((c) => c.id !== id),
        total_campers: previous.total_campers - 1,
        total_points: previous.total_points - (removed?.points ?? 0),
      });
    }
    try {
      await removeCamper({ camper_id: id });
      toast.success(`${name} was removed. Their profile and points are saved.`);
      await refreshRosterViews();
    } catch (error) {
      if (previous) queryClient.setQueryData<CampersData>(cacheKey, previous);
      toast.error("Couldn't remove: " + errorMessage(error));
    }
  }, [pendingRemove, removeCamper, inputs]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-xl" />
        ))}
      </div>
    );
  }

  const campers = data?.campers ?? [];

  return (
    <div>
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 bg-muted/50 border-border">
          <div className="text-2xl font-bold">{data?.total_campers ?? 0}</div>
          <div className="text-xs text-muted-foreground">Total Learners</div>
        </Card>
        <Card className="p-4 bg-muted/50 border-border">
          <div className="text-2xl font-bold">{data?.total_points ?? 0}</div>
          <div className="text-xs text-muted-foreground">Total Points Awarded</div>
        </Card>
        <Card className="p-4 bg-muted/50 border-border">
          <div className="text-2xl font-bold">
            {campers.filter((c) => c.profile_completed).length}
          </div>
          <div className="text-xs text-muted-foreground">Profiles Complete</div>
        </Card>
        <Card className="p-4 bg-muted/50 border-border">
          <div className="text-2xl font-bold">
            {campers.length > 0 ? Math.round(data!.total_points / campers.length) : 0}
          </div>
          <div className="text-xs text-muted-foreground">Avg Points/Learner</div>
        </Card>
      </div>

      {/* Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${fetching ? "opacity-70" : ""}`}>
        {campers.map((camper) => (
          <Card
            key={camper.id}
            className="p-4 bg-card border shadow-sm cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
            onClick={() => onCamperClick(camper.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {camper.first_name} {camper.last_name}
                </h3>
                <p className="text-xs text-gray-500 truncate max-w-[160px]">{camper.email}</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                  <Icon name="star" className="w-3 h-3" />
                  {camper.points}
                </div>
                {canEdit && (
                  <button
                    type="button"
                    title="Remove from cAMP"
                    aria-label={`Remove ${camper.first_name} ${camper.last_name} from cAMP`}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingRemove({ id: camper.id, name: `${camper.first_name} ${camper.last_name}` });
                    }}
                  >
                    <Icon icon="user-x" className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Team */}
            {camper.team_name && (
              <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                <Icon name="flag" className="w-3 h-3" />
                {camper.team_name}
              </div>
            )}

            {/* Metrics Row */}
            <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 pt-2 border-t border-gray-100">
              <span className="flex items-center gap-1">
                <Icon name="check-circle" className="w-3 h-3 text-emerald-500" />
                {camper.checkin_count} check-ins
              </span>
              {camper.late_count > 0 && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Icon name="clock" className="w-3 h-3" />
                  {camper.late_count} late
                </span>
              )}
            </div>

            {/* Goals Progress */}
            <div className="flex items-center gap-1 mt-2">
              {[camper.goal_1_achieved, camper.goal_2_achieved, camper.goal_3_achieved].map((achieved, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full ${achieved ? "bg-emerald-500" : "bg-gray-200"}`}
                  title={`Goal ${i + 1}: ${achieved ? "Achieved" : "Pending"}`}
                />
              ))}
              <span className="text-[10px] text-gray-400 ml-1">goals</span>
            </div>

            {/* Profile Status */}
            {!camper.profile_completed && (
              <div className="mt-2 text-[10px] text-amber-600 flex items-center gap-1">
                <Icon name="alert-circle" className="w-3 h-3" />
                Profile incomplete
              </div>
            )}
          </Card>
        ))}
      </div>

      {campers.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Icon name="users" className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No learners in this cohort yet</p>
        </div>
      )}

      <RemovedCampersList canEdit={canEdit} />

      <ConfirmRemoveCamperDialog
        name={pendingRemove?.name ?? null}
        onCancel={() => setPendingRemove(null)}
        onConfirm={handleConfirmRemove}
      />
    </div>
  );
}
