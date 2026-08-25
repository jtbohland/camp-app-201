import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  camperId: number;
  onBack: () => void;
}

export default function AdminCamperDetail({ camperId }: Props) {
  const { data, loading } = useApiData("GetAdminCamperDetail", {
    camper_id: camperId,
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data?.camper) {
    return <p className="text-white/60 text-center py-8">Camper not found</p>;
  }

  const { camper, points_log, checkins } = data;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6 bg-white/95 border-0 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {camper.first_name} {camper.last_name}
            </h2>
            <p className="text-sm text-gray-500">{camper.email}</p>
            {camper.team_name && (
              <p className="text-sm text-emerald-700 flex items-center gap-1 mt-1">
                <Icon name="flag" className="w-3 h-3" />
                {camper.team_name}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-emerald-700">{camper.points}</div>
            <div className="text-xs text-gray-500">total points</div>
            {camper.pin && (
              <div className="mt-2 text-xs text-gray-400">PIN: {camper.pin}</div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-100">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{checkins.length}</div>
            <div className="text-[10px] text-gray-500">Check-ins</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {[camper.goal_1_achieved, camper.goal_2_achieved, camper.goal_3_achieved].filter(Boolean).length}/3
            </div>
            <div className="text-[10px] text-gray-500">Goals Hit</div>
          </div>
          <div className="text-center">
            <div className={`text-lg font-bold ${camper.profile_completed ? "text-emerald-600" : "text-amber-600"}`}>
              {camper.profile_completed ? "✓" : "✗"}
            </div>
            <div className="text-[10px] text-gray-500">Profile</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">
              {new Date(camper.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </div>
            <div className="text-[10px] text-gray-500">Joined</div>
          </div>
        </div>
      </Card>

      {/* Goals */}
      <Card className="p-5 bg-white/95 border-0 shadow-lg">
        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Icon name="target" className="w-4 h-4 text-emerald-600" />
          Goals
        </h3>
        <div className="space-y-2">
          {[
            { text: camper.goal_1, achieved: camper.goal_1_achieved },
            { text: camper.goal_2, achieved: camper.goal_2_achieved },
            { text: camper.goal_3, achieved: camper.goal_3_achieved },
          ].map((goal, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                goal.achieved ? "bg-emerald-500" : "bg-gray-200"
              }`}>
                {goal.achieved && <Icon name="check" className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-sm ${goal.achieved ? "line-through text-gray-400" : "text-gray-700"}`}>
                {goal.text || <span className="italic text-gray-400">Not set</span>}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Points Log */}
        <Card className="p-5 bg-white/95 border-0 shadow-lg">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Icon name="star" className="w-4 h-4 text-amber-500" />
            Points History
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {points_log.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No points logged yet</p>
            ) : (
              points_log.map((log, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm text-gray-700">{log.reason}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <span className={`text-sm font-bold ${log.points >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {log.points > 0 ? "+" : ""}{log.points}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Check-in History */}
        <Card className="p-5 bg-white/95 border-0 shadow-lg">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Icon name="clock" className="w-4 h-4 text-blue-500" />
            Check-in History
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {checkins.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No check-ins recorded</p>
            ) : (
              checkins.map((ci, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                  <div>
                    <p className="text-sm text-gray-700">{ci.session_label}</p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(ci.checked_in_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      ci.timing === "early" ? "bg-emerald-100 text-emerald-700" :
                      ci.timing === "on_time" ? "bg-blue-100 text-blue-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {ci.timing}
                    </span>
                    <span className={`text-xs font-bold ${ci.points_awarded >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                      {ci.points_awarded > 0 ? "+" : ""}{ci.points_awarded}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Bio/Fun Fact */}
      {(camper.bio || camper.fun_fact) && (
        <Card className="p-5 bg-white/95 border-0 shadow-lg">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Icon name="circle-user" className="w-4 h-4 text-purple-500" />
            About
          </h3>
          {camper.bio && (
            <p className="text-sm text-gray-700 mb-2">{camper.bio}</p>
          )}
          {camper.fun_fact && (
            <p className="text-sm text-gray-600 italic">Fun fact: {camper.fun_fact}</p>
          )}
        </Card>
      )}
    </div>
  );
}
