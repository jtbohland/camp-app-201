import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/icon";

type Props = { deadline: string | null };

function split(ms: number) {
  const s = Math.floor(Math.abs(ms) / 1000);
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/** e.g. "Mon, Nov 16 at 9:00 AM PT" */
export function formatDue(deadline: string): string {
  const d = new Date(deadline);
  if (isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-US", { timeZone: "America/Los_Angeles", weekday: "short", month: "short", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { timeZone: "America/Los_Angeles", hour: "numeric", minute: "2-digit" });
  return `${day} at ${time} PT`;
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center min-w-[3.25rem]">
      <span className="font-mono text-2xl font-bold tabular-nums leading-none">{String(value).padStart(2, "0")}</span>
      <span className="text-[10px] uppercase tracking-wider opacity-80 mt-1">{label}</span>
    </div>
  );
}

/** Big ticking countdown to the pre-work deadline. Turns into an "overdue" timer once it passes. */
export default function ReminderCountdown({ deadline }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!deadline) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
        <Icon icon="calendar-clock" className="w-4 h-4" />
        Due date coming soon. Your counselors will set it before cAMP starts.
      </div>
    );
  }

  const diff = new Date(deadline).getTime() - now;
  const overdue = diff <= 0;
  const t = split(diff);
  const urgent = overdue || diff < 24 * 3600 * 1000;
  const tone = urgent
    ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
    : diff < 3 * 24 * 3600 * 1000
      ? "bg-camp-amber/10 border-camp-amber/30 text-camp-amber"
      : "bg-camp-green/10 border-camp-green/30 text-camp-green";

  return (
    <div className={`rounded-lg border px-4 py-3 ${tone}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
          <Icon icon={overdue ? "alarm-clock-off" : "alarm-clock"} className={`w-4 h-4 ${urgent ? "animate-pulse" : ""}`} />
          {overdue ? "Overdue by" : "Time left"}
        </div>
        <span className="text-xs font-medium">Due {formatDue(deadline)}</span>
      </div>
      <div className="flex items-center justify-center gap-2 mt-2">
        <Unit value={t.days} label="days" />
        <span className="text-xl font-bold opacity-60">:</span>
        <Unit value={t.hours} label="hrs" />
        <span className="text-xl font-bold opacity-60">:</span>
        <Unit value={t.minutes} label="min" />
        <span className="text-xl font-bold opacity-60">:</span>
        <Unit value={t.seconds} label="sec" />
      </div>
    </div>
  );
}
