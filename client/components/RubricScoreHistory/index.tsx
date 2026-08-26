import { useApiData } from "@/hooks/useApiData";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export default function RubricScoreHistory() {
  const { data } = useApiData("GetRubricScores", { team_id: null, cohort_id: null });
  const scores = data?.scores ?? [];

  if (scores.length === 0) return null;

  return (
    <Card className="p-5 bg-white/95 border-0 shadow-lg">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Icon name="history" className="w-4 h-4 text-blue-500" />
        Recent Scores
      </h3>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {scores.map((score) => (
          <div key={score.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-900">{score.team_name}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  {score.template_name}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Scored by {score.scored_by_name} • {new Date(score.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
              </p>
              {score.notes && (
                <p className="text-xs text-gray-600 mt-1 italic">"{score.notes}"</p>
              )}
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-emerald-700">{score.total_score}/{score.max_score}</div>
              <div className="text-[10px] text-amber-600 font-medium">+{score.points_awarded} pts/member</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
