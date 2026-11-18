import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData.js";
import RubricCriterionCard from "@/components/RubricCriterionCard/index.js";
import type { Criterion } from "@/components/JudgeScoreForm/index.js";

type Props = { rubricTemplateId: number };

/** Read-only view of the exact rubric counselors score this presentation with. */
export default function HubRubric({ rubricTemplateId }: Props) {
  const { data, loading, isError } = useApiData("GetRubricTemplate", { rubric_template_id: rubricTemplateId }, { staleTime: 60_000 });
  const template = data?.template as
    | { name: string; description: string | null; criteria: Criterion[]; max_total_points: number }
    | null
    | undefined;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }
  if (isError || !template) {
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        The rubric for this session isn't available yet.
      </Card>
    );
  }

  const criteria = template.criteria ?? [];

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-start gap-3 border-violet-200 bg-violet-50/50 p-4">
        <Icon icon="clipboard-check" className="mt-0.5 h-5 w-5 shrink-0 text-violet-500" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground">{template.name}</h3>
          {template.description && <p className="mt-0.5 text-xs text-muted-foreground">{template.description}</p>}
          <p className="mt-1 text-xs text-muted-foreground">
            This is the exact rubric your counselors and judges use. It's here for reference only.
          </p>
        </div>
        <span className="whitespace-nowrap rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
          Max {template.max_total_points} pts per judge
        </span>
      </Card>

      <div className="space-y-3">
        {criteria.map((c) => (
          <RubricCriterionCard key={c.name} criterion={c} />
        ))}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
        <Icon icon="award" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p>
          <strong>MVP (Most Valuable Presenter)</strong> may be awarded if a judge feels someone truly carried the team or exceeded
          expectations. It isn't guaranteed, so focus on team success.
        </p>
      </div>
    </div>
  );
}
