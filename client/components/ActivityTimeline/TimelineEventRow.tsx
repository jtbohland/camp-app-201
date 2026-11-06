import { memo } from "react";
import { Icon } from "@/components/ui/icon";
import type { IconName } from "lucide-react/dynamic";

export type TimelineEvent = {
  key: string;
  kind: string;
  status: string;
  title: string;
  detail: string | null;
  at: string;
  points: number | null;
};

const KIND_ICONS: Record<string, IconName> = {
  checkin: "calendar-check",
  survey: "clipboard-check",
  badge: "award",
  memory: "camera",
  exec_q: "message-circle-question",
  wheel: "ferris-wheel",
  prework: "book-open",
  feedback: "heart-handshake",
  absence: "calendar-x",
  points: "trending-down",
};

const STATUS_STYLES: Record<string, { dot: string; pill: string; label: string }> = {
  done: { dot: "bg-emerald-100 text-emerald-700", pill: "bg-emerald-100 text-emerald-700", label: "Done" },
  late: { dot: "bg-amber-100 text-amber-700", pill: "bg-amber-100 text-amber-700", label: "Late" },
  missed: { dot: "bg-red-100 text-red-700", pill: "bg-red-100 text-red-700", label: "Missed" },
  excused: { dot: "bg-blue-100 text-blue-700", pill: "bg-blue-100 text-blue-700", label: "Excused" },
  info: { dot: "bg-muted text-muted-foreground", pill: "bg-muted text-muted-foreground", label: "Note" },
};

/** One row of the activity timeline. */
function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const style = STATUS_STYLES[event.status] ?? STATUS_STYLES.info;
  const time = new Date(event.at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return (
    <div className="flex items-start gap-3 py-2">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${style.dot}`}>
        <Icon icon={KIND_ICONS[event.kind] ?? "circle"} className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className={`truncate text-xs font-medium ${event.status === "missed" ? "text-red-700" : "text-foreground"}`}>{event.title}</p>
          {event.status !== "done" && (
            <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase ${style.pill}`}>{style.label}</span>
          )}
        </div>
        {event.detail && <p className="line-clamp-2 text-[11px] text-muted-foreground">{event.detail}</p>}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[10px] text-muted-foreground">{time}</p>
        {event.points != null && event.points !== 0 && (
          <p className={`text-[11px] font-bold ${event.points < 0 ? "text-red-600" : "text-emerald-600"}`}>
            {event.points > 0 ? `+${event.points}` : event.points}
          </p>
        )}
      </div>
    </div>
  );
}

export default memo(TimelineEventRow);
