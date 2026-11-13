import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { isTeamWork, prepStatus, presKey, presTypeMeta, type HubPresentation } from "@/lib/teamHub";

type Props = {
  presentations: HubPresentation[];
  postCounts: Map<string, number>;
  feedbackCounts: Map<number, number>;
  /** Counselors can open locked sessions; cAMPers can't. */
  isCounselor: boolean;
  onOpen: (tabKey: string) => void;
};

/** Every scheduled session, with the team's prep progress. Open/live ones come first. */
export default function HubHomeUpNext({ presentations, postCounts, feedbackCounts, isCounselor, onOpen }: Props) {
  const teamSessions = presentations.filter((p) => isTeamWork(p.presentation_type));
  const live = teamSessions.filter((p) => p.status === "in_progress" || (!p.is_locked && p.status !== "completed"));
  const next = teamSessions.find((p) => p.is_locked && p.status !== "completed");

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Team sessions</h3>
        <span className="text-xs text-muted-foreground">
          {live.length > 0 ? `${live.length} open now` : next ? `Next: ${next.title}` : "All wrapped"}
        </span>
      </div>
      {teamSessions.length === 0 ? (
        <p className="text-sm text-muted-foreground">Counselors haven't scheduled team sessions yet.</p>
      ) : (
        <div className="flex flex-col divide-y divide-border">
          {teamSessions.map((p) => {
            const status = prepStatus(p, postCounts.get(presKey(p.id)) ?? 0);
            const fb = feedbackCounts.get(p.id) ?? 0;
            const isOpen = !p.is_locked && p.status !== "completed";
            const blocked = p.is_locked && !isCounselor;
            return (
              <button
                key={p.id}
                type="button"
                disabled={blocked}
                title={blocked ? "Locked until counselors open it" : undefined}
                onClick={blocked ? undefined : () => onOpen(presKey(p.id))}
                className={`flex items-center gap-3 py-2.5 text-left transition-colors ${
                  blocked ? "cursor-not-allowed opacity-60" : "hover:bg-muted/40"
                }`}
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  <Icon icon={presTypeMeta(p.presentation_type).icon} className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Day {p.day_number}
                    {p.status === "completed" ? " · Completed" : p.is_locked ? " · Locked" : p.status === "in_progress" ? " · Live now" : " · Open"}
                    {fb > 0 && ` · ${fb} feedback`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${status.done ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>
                  {status.done && <Icon icon="check" className="mr-0.5 inline h-3 w-3" />}
                  {status.label}
                </span>
                <Icon icon={blocked ? "lock" : "chevron-right"} className="h-4 w-4 shrink-0 text-muted-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
