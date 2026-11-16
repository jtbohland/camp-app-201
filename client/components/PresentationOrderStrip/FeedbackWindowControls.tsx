import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCountdown } from "@/components/PeerFeedbackForm/FeedbackStatusNote.js";
import type { PresentationRound } from "./index.js";

export type FeedbackAction = "close_feedback" | "reopen_feedback" | "auto_feedback";

type Props = {
  feedback: PresentationRound["feedback"];
  busy: boolean;
  onAction: (action: FeedbackAction) => void;
};

/** Counselor view of the cAMPfire feedback window: status, countdown, and close / reopen buttons. */
export default function FeedbackWindowControls({ feedback, busy, onAction }: Props) {
  const countdown = useCountdown(feedback.status === "closing" ? feedback.closes_at : null);
  if (feedback.status === "none") return null;

  const label =
    feedback.status === "closed"
      ? feedback.override === "closed" ? "Feedback closed (by a counselor)" : "Feedback closed"
      : feedback.status === "closing"
        ? `Feedback closes in ${countdown}`
        : feedback.override === "reopened"
          ? "Feedback reopened (stays open until you close it)"
          : "Feedback open · closes 10 min after every team is scored";

  const tone =
    feedback.status === "closed"
      ? "border-border/60 bg-muted/40 text-muted-foreground"
      : feedback.status === "closing"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";

  return (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-xs ${tone}`}>
      <span className="flex items-center gap-1.5 font-medium">
        <Icon icon={feedback.status === "closed" ? "lock" : feedback.status === "closing" ? "hourglass" : "message-circle"} className="h-3.5 w-3.5" />
        <span className="tabular-nums">{label}</span>
      </span>
      <div className="flex items-center gap-1.5">
        {feedback.status === "closed" ? (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("reopen_feedback")}>
            <Icon icon="lock-open" className="mr-1 h-3.5 w-3.5" /> Reopen feedback
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => onAction("close_feedback")}>
            <Icon icon="lock" className="mr-1 h-3.5 w-3.5" /> Close feedback now
          </Button>
        )}
        {feedback.override !== null && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction("auto_feedback")}>
            Back to automatic
          </Button>
        )}
      </div>
    </div>
  );
}
