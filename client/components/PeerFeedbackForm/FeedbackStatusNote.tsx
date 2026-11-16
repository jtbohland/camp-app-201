import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

type Props = {
  status: "none" | "open" | "closing" | "closed";
  presentationTitle: string | null;
  closesAt: string | null;
  /** How many teams this cAMPer has reviewed for the live presentation. */
  reviewedCount: number;
  /** Teams this cAMPer can review this round (presented teams, not their own). */
  reviewableCount: number;
};

/** Live countdown text like "8:41". */
export function useCountdown(closesAt: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!closesAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [closesAt]);
  if (!closesAt) return null;
  const ms = Math.max(0, Date.parse(closesAt) - now);
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Tells cAMPers whether they can give feedback right now, and how long they have left. */
export default function FeedbackStatusNote({ status, presentationTitle, closesAt, reviewedCount, reviewableCount }: Props) {
  const countdown = useCountdown(status === "closing" ? closesAt : null);

  if (status === "none") {
    return (
      <Note icon="clock" tone="muted">
        cAMPfire Feedback opens when the next presentation starts.
      </Note>
    );
  }
  if (status === "closed") {
    return (
      <Note icon="lock" tone="muted">
        Feedback for <b>{presentationTitle}</b> is closed. It opens again at the next presentation.
      </Note>
    );
  }
  if (status === "closing") {
    return (
      <Note icon="hourglass" tone="amber">
        Every team has presented and been scored. Feedback for <b>{presentationTitle}</b> closes in{" "}
        <b className="tabular-nums">{countdown}</b>.
        {reviewableCount > 0 && ` You've reviewed ${reviewedCount} of ${reviewableCount}.`}
      </Note>
    );
  }
  if (reviewableCount === 0) {
    return (
      <Note icon="mic" tone="indigo">
        Feedback opens for each team as soon as they present.
      </Note>
    );
  }
  return null;
}

function Note({ icon, tone, children }: { icon: "clock" | "lock" | "hourglass" | "mic"; tone: "muted" | "amber" | "indigo"; children: React.ReactNode }) {
  const tones = {
    muted: "border-border/50 bg-muted/40 text-muted-foreground",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    indigo: "border-indigo-200 bg-indigo-50 text-indigo-800",
  };
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${tones[tone]}`}>
      <Icon icon={icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
