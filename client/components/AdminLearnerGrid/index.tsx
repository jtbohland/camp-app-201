import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  cohortId: number | null;
  onCamperClick: (camperId: number) => void;
}

export default function AdminLearnerGrid({ cohortId, onCamperClick }: Props) {
  const { data, loading, fetching } = useApiData("GetAdminCampers", {
    cohort_id: cohortId,
  });

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
        <Card className="p-4 bg-white/10 border-white/20 text-white">
          <div className="text-2xl font-bold">{data?.total_campers ?? 0}</div>
          <div className="text-xs text-white/70">Total Learners</div>
        </Card>
        <Card className="p-4 bg-white/10 border-white/20 text-white">
          <div className="text-2xl font-bold">{data?.total_points ?? 0}</div>
          <div className="text-xs text-white/70">Total Points Awarded</div>
        </Card>
        <Card className="p-4 bg-white/10 border-white/20 text-white">
          <div className="text-2xl font-bold">
            {campers.filter((c) => c.profile_completed).length}
          </div>
          <div className="text-xs text-white/70">Profiles Complete</div>
        </Card>
        <Card className="p-4 bg-white/10 border-white/20 text-white">
          <div className="text-2xl font-bold">
            {campers.length > 0 ? Math.round(data!.total_points / campers.length) : 0}
          </div>
          <div className="text-xs text-white/70">Avg Points/Learner</div>
        </Card>
      </div>

      {/* Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 ${fetching ? "opacity-70" : ""}`}>
        {campers.map((camper) => (
          <Card
            key={camper.id}
            className="p-4 bg-white/95 border-0 shadow-lg cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all"
            onClick={() => onCamperClick(camper.id)}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">
                  {camper.first_name} {camper.last_name}
                </h3>
                <p className="text-xs text-gray-500 truncate max-w-[160px]">{camper.email}</p>
              </div>
              <div className="flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-semibold">
                <Icon name="star" className="w-3 h-3" />
                {camper.points}
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
        <div className="text-center py-16 text-white/60">
          <Icon name="users" className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg">No learners in this cohort yet</p>
        </div>
      )}
    </div>
  );
}
