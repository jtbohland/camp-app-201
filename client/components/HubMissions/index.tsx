import { useNavigate } from "react-router";
import { useApiData } from "@/hooks/useApiData.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";

type Props = {
  teamId: number;
  camperId: number;
};

export default function HubMissions({ teamId, camperId }: Props) {
  const navigate = useNavigate();
  const { data, loading } = useApiData("GetPresentations", { status: null });

  // Only show unlocked presentations that are relevant
  const presentations = (data?.presentations ?? []).filter(
    (p: any) => !p.is_locked
  ) as any[];

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading missions…</div>;
  }

  if (presentations.length === 0) {
    return (
      <Card className="p-8 text-center border-dashed">
        <div className="text-3xl mb-2">🗺️</div>
        <p className="text-sm font-medium text-muted-foreground">No missions unlocked yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">Counselors will unlock presentations as the week progresses.</p>
      </Card>
    );
  }

  // Sort by day then sort_order
  const sorted = [...presentations].sort((a: any, b: any) => {
    const dayA = a.day_number ?? 99;
    const dayB = b.day_number ?? 99;
    if (dayA !== dayB) return dayA - dayB;
    return a.sort_order - b.sort_order;
  });

  return (
    <div className="space-y-3">
      {sorted.map((p: any) => {
        const hasQuestions = Array.isArray(p.questions) && p.questions.length > 0;
        const totalQuestions = hasQuestions
          ? p.questions.reduce((sum: number, s: any) => sum + (s.questions?.length ?? 0), 0)
          : 0;
        const hasPresTime = p.present_time_minutes != null && p.present_time_minutes > 0;

        return (
          <Card key={p.id} className="overflow-hidden border-l-4 border-l-primary/40 hover:border-l-primary transition-colors">
            <div className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Title + day badge */}
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-sm text-foreground truncate">{p.title}</h3>
                    {p.day_number && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        Day {p.day_number}
                      </span>
                    )}
                  </div>

                  {/* One-liner objective */}
                  {p.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{p.description}</p>
                  )}

                  {/* Key meta */}
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    {p.prep_time_minutes > 0 && (
                      <span className="flex items-center gap-1">
                        <Icon icon="clock" className="w-3 h-3" />
                        {p.prep_time_minutes}m prep
                      </span>
                    )}
                    {hasPresTime && (
                      <span className="flex items-center gap-1">
                        <Icon icon="timer" className="w-3 h-3" />
                        {p.present_time_minutes}m present
                      </span>
                    )}
                    {totalQuestions > 0 && (
                      <span className="flex items-center gap-1 text-camp-green">
                        <Icon icon="edit-3" className="w-3 h-3" />
                        {totalQuestions} questions
                      </span>
                    )}
                  </div>
                </div>

                {/* View Full Brief button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/presentations")}
                  className="shrink-0 text-xs"
                >
                  <Icon icon="external-link" className="w-3.5 h-3.5 mr-1" />
                  Full Brief
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
