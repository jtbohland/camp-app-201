import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import type { HubFeedback, HubScore } from "@/lib/teamHub";

type Props = {
  feedback: HubFeedback[];
  score: HubScore | null;
  /** Counselors see scores before they're revealed; cAMPers only after. */
  scoreHiddenFromTeam: boolean;
};

const GROUPS: { keys: string[]; label: string; icon: string; tone: string }[] = [
  { keys: ["sunshine", "liked", "went_well"], label: "Glow", icon: "☀️", tone: "bg-amber-50 border-amber-100" },
  { keys: ["rain", "missed_opportunity"], label: "Grow", icon: "🌱", tone: "bg-sky-50 border-sky-100" },
  { keys: ["trail_notes", "feedback"], label: "Trail notes", icon: "📝", tone: "bg-muted/50 border-border" },
];

const pretty = (name: string) => name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/** Rubric results (once revealed) and cAMPfire peer feedback this team received. */
export default function HubFeedbackReceived({ feedback, score, scoreHiddenFromTeam }: Props) {
  if (!score && feedback.length === 0) {
    return (
      <Card className="p-5 text-center">
        <Icon icon="message-circle" className="mx-auto h-7 w-7 text-muted-foreground/40" />
        <p className="mt-2 text-sm text-muted-foreground">
          Feedback from judges and other teams shows up here after you present.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {score && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Icon icon="clipboard-check" className="h-4 w-4 text-primary" /> Judges' score
            </h3>
            <span className="text-lg font-bold text-primary">
              {score.avg_total} <span className="text-sm font-normal text-muted-foreground">/ {score.max}</span>
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Average of {score.judge_count} judge{score.judge_count === 1 ? "" : "s"}
            {scoreHiddenFromTeam && " · Only counselors can see this until scores are revealed"}
          </p>
          {score.criteria.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              {score.criteria.map((c) => (
                <div key={c.name} className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-1.5 text-sm">
                  <span className="text-foreground">{pretty(c.name)}</span>
                  <span className="font-medium text-foreground">{c.avg}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {feedback.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            🏕️ cAMPfire feedback <span className="text-xs font-normal text-muted-foreground">from other cAMPers</span>
          </h3>
          <div className="grid gap-3 md:grid-cols-3">
            {GROUPS.map((g) => {
              const list = feedback.filter((f) => g.keys.includes(f.category));
              if (list.length === 0) return null;
              return (
                <div key={g.label} className="flex flex-col gap-1.5">
                  <p className="text-xs font-semibold text-foreground">{g.icon} {g.label} ({list.length})</p>
                  {list.slice(0, 30).map((f) => (
                    <div key={f.id} className={`rounded-md border px-3 py-2 ${g.tone}`}>
                      <p className="text-sm text-foreground">{f.content}</p>
                      <p className="mt-0.5 text-[10px] text-muted-foreground">{f.author_name}</p>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
