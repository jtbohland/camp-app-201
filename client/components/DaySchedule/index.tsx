import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Icon } from "@/components/ui/icon";

export type AgendaItem = {
  id: number;
  session_bank_id: number | null;
  day_number: number;
  start_time: string;
  end_time: string;
  title: string;
  session_type: string;
};

type DayScheduleProps = {
  dayNumber: number;
  dayLabel: string;
  items: AgendaItem[];
  isAdmin: boolean;
  onRemoveItem?: (id: number) => void;
  onEditItem?: (item: AgendaItem) => void;
  onClearDay?: (dayNumber: number) => void;
  showHeader?: boolean;
  currentTimeMinutes?: number | null;
  /** Live "it will land here" ghost while dragging. */
  dropPreview?: { startMin: number; endMin: number; conflict: string | null } | null;
};

/** Grid runs 8:30 AM → 9:00 PM (evening covers team dinners / happy hours). 40px per 30 minutes. */
const GRID_START_MIN = 8 * 60 + 30;
const GRID_END_MIN = 21 * 60;
/** Where the work day ends; time after this is lightly shaded as "evening". */
const EVENING_START_MIN = 17 * 60;
const SLOT_HEIGHT = 40;
const PX_PER_MIN = SLOT_HEIGHT / 30;
const GRID_HEIGHT = (GRID_END_MIN - GRID_START_MIN) * PX_PER_MIN;

const TIME_SLOTS: string[] = [];
for (let m = GRID_START_MIN; m < GRID_END_MIN; m += 30) {
  TIME_SLOTS.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${m} ${ampm}`;
}

// Color map per session type
const TYPE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  core:         { bg: "bg-emerald-50",  border: "border-emerald-200",  text: "text-emerald-700" },
  challenger:   { bg: "bg-blue-50",     border: "border-blue-200",     text: "text-blue-700" },
  workshop:     { bg: "bg-purple-50",   border: "border-purple-200",   text: "text-purple-700" },
  value:        { bg: "bg-teal-50",     border: "border-teal-200",     text: "text-teal-700" },
  presentation: { bg: "bg-amber-50",    border: "border-amber-200",    text: "text-amber-700" },
  executive:    { bg: "bg-yellow-50",   border: "border-yellow-300",   text: "text-yellow-800" },
  social:       { bg: "bg-pink-50",     border: "border-pink-200",     text: "text-pink-700" },
  break:        { bg: "bg-gray-50",     border: "border-gray-200",     text: "text-gray-500" },
  lunch:        { bg: "bg-orange-50",   border: "border-orange-200",   text: "text-orange-700" },
  session:      { bg: "bg-emerald-50",  border: "border-emerald-200",  text: "text-emerald-700" },
};

function getColors(type: string) {
  return TYPE_COLORS[type] ?? TYPE_COLORS.session;
}

function ScheduledBlock({ item, isAdmin, onRemove, onEdit, isPast, isUpNext }: { item: AgendaItem; isAdmin: boolean; onRemove?: () => void; onEdit?: () => void; isPast?: boolean; isUpNext?: boolean }) {
  const isDraggableItem = isAdmin && item.session_type !== "lunch";
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `agenda-${item.id}`,
    data: { agendaItem: item },
    disabled: !isDraggableItem,
  });

  const startMin = timeToMinutes(item.start_time);
  const endMin = timeToMinutes(item.end_time);
  const durationMin = endMin - startMin;
  const topOffset = (startMin - GRID_START_MIN) * PX_PER_MIN;
  const height = durationMin * PX_PER_MIN;
  const colors = getColors(item.session_type);
  const isExec = item.session_type === "executive";
  const isShort = durationMin < 30;

  return (
    <div
      ref={isDraggableItem ? setNodeRef : undefined}
      title={`${item.title} · ${formatTime(item.start_time)} – ${formatTime(item.end_time)}${isDraggableItem && onEdit ? " · Click to edit timing" : ""}`}
      onClick={isDraggableItem && onEdit ? onEdit : undefined}
      className={`absolute left-0 right-0 mx-1 rounded-md border overflow-hidden group ${isShort ? "flex items-center px-1.5" : "px-2 py-1"} ${colors.bg} ${colors.border} ${isDraggableItem ? "cursor-grab active:cursor-grabbing touch-none" : ""} ${isDragging ? "opacity-30 z-0" : "z-10"} ${isPast ? "opacity-40" : ""} ${isUpNext ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
      style={{ top: `${topOffset}px`, height: `${height - 2}px` }}
      {...(isDraggableItem ? attributes : {})}
      {...(isDraggableItem ? listeners : {})}
    >
      <div className={`flex w-full justify-between gap-1 ${isShort ? "items-center" : "items-start"}`}>
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${colors.text} ${isShort ? "text-[10px] leading-none truncate" : "text-xs leading-tight"}`}>
            {isExec && "⭐ "}{isUpNext && "▶ "}{item.title}
          </p>
          {durationMin >= 45 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatTime(item.start_time)} – {formatTime(item.end_time)}
            </p>
          )}
          {isExec && durationMin >= 30 && (
            <p className="text-[9px] text-yellow-600 italic mt-0.5">Mandatory — all cAMPers expected</p>
          )}
        </div>
        {isAdmin && item.session_type !== "lunch" && onRemove && (
          <button
            type="button"
            aria-label={`Remove ${item.title}`}
            title="Remove from schedule"
            className={`flex-shrink-0 flex items-center justify-center rounded hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity ${isShort ? "h-3.5 w-3.5" : "h-5 w-5"}`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          >
            <Icon icon="x" className={`${isShort ? "w-2.5 h-2.5" : "w-3 h-3"} text-destructive`} />
          </button>
        )}
      </div>
    </div>
  );
}

/** Hour labels (9a, 10a…) sit on the hour lines; half hours get a small unlabeled tick. */
export function TimeGutter() {
  const marks: { top: number; label: string | null }[] = [];
  for (let m = GRID_START_MIN; m <= GRID_END_MIN; m += 30) {
    const isHour = m % 60 === 0;
    const h = Math.floor(m / 60);
    marks.push({
      top: (m - GRID_START_MIN) * PX_PER_MIN,
      label: isHour ? `${h > 12 ? h - 12 : h}${h >= 12 ? "p" : "a"}` : null,
    });
  }
  return (
    <div className="relative w-12 flex-shrink-0" style={{ height: `${GRID_HEIGHT}px` }}>
      {marks.map((mk) => (
        <div key={mk.top} className="absolute right-0 flex items-center" style={{ top: `${mk.top}px` }}>
          {mk.label && (
            <span className="-translate-y-1/2 pr-1.5 text-[10px] font-medium text-muted-foreground">{mk.label}</span>
          )}
          <div className={`-translate-y-1/2 border-t border-border ${mk.label ? "w-2" : "w-1"}`} />
        </div>
      ))}
    </div>
  );
}

export default function DaySchedule({ dayNumber, dayLabel, items, isAdmin, onRemoveItem, onEditItem, onClearDay, showHeader = true, currentTimeMinutes = null, dropPreview = null }: DayScheduleProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `day-${dayNumber}`,
    data: { dayNumber },
    disabled: !isAdmin,
  });

  const lunchItem: AgendaItem = {
    id: -dayNumber, session_bank_id: null, day_number: dayNumber,
    start_time: "12:00", end_time: "13:00", title: "Lunch", session_type: "lunch",
  };

  // Only add the fixed Lunch block when the day doesn't already have a Lunch session.
  const hasLunch = items.some((i) => i.title.trim().toLowerCase() === "lunch");
  const allItems = hasLunch ? items : [...items, lunchItem];

  const upNextId =
    currentTimeMinutes !== null
      ? allItems
          .filter((o) => timeToMinutes(o.start_time) > currentTimeMinutes)
          .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))[0]?.id
      : undefined;

  return (
    <div className="flex flex-col">
      {showHeader && (
        <div className="flex items-center justify-center gap-1 h-10 border-b border-border bg-muted/30 rounded-t-lg relative">
          <span className="text-sm font-semibold">{dayLabel}</span>
          {isAdmin && onClearDay && items.length > 0 && (
            <button
              onClick={() => onClearDay(dayNumber)}
              className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Clear day (keep lunch)"
            >
              <Icon icon="trash-2" className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      <div
        ref={setNodeRef}
        id={`day-col-${dayNumber}`}
        className={`relative rounded transition-colors ${isOver ? "bg-camp-green/5 ring-1 ring-camp-green/40" : ""}`}
        style={{ height: `${GRID_HEIGHT}px` }}
      >
        {/* "Now" line */}
        {currentTimeMinutes !== null && currentTimeMinutes >= GRID_START_MIN && currentTimeMinutes <= GRID_END_MIN && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${(currentTimeMinutes - GRID_START_MIN) * PX_PER_MIN}px` }}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
              <div className="flex-1 h-[2px] bg-red-500" />
            </div>
          </div>
        )}

        {/* Evening (after 5 PM) is lightly shaded so the work day stays easy to read */}
        <div
          className="absolute left-0 right-0 bottom-0 pointer-events-none bg-muted/40 rounded-b"
          style={{ top: `${(EVENING_START_MIN - GRID_START_MIN) * PX_PER_MIN}px` }}
        />

        {/* Grid lines: solid on the hour, faint dashed on the half hour */}
        {TIME_SLOTS.map((slot, idx) => {
          const isHour = slot.endsWith(":00");
          return (
            <div
              key={slot}
              className={`absolute left-0 right-0 pointer-events-none ${isHour ? "border-t border-border" : "border-t border-dashed border-border/40"}`}
              style={{ top: `${idx * SLOT_HEIGHT}px` }}
            />
          );
        })}

        {dropPreview && (
          <div
            className={`absolute left-1 right-1 z-30 pointer-events-none rounded-md border-2 border-dashed px-2 flex items-start ${
              dropPreview.conflict
                ? "border-destructive/70 bg-destructive/10 text-destructive"
                : "border-camp-green bg-camp-green/10 text-camp-green"
            }`}
            style={{
              top: `${(Math.max(dropPreview.startMin, GRID_START_MIN) - GRID_START_MIN) * PX_PER_MIN}px`,
              height: `${Math.max(
                (Math.min(dropPreview.endMin, GRID_END_MIN) - Math.max(dropPreview.startMin, GRID_START_MIN)) * PX_PER_MIN,
                14
              )}px`,
            }}
          >
            <span className="text-[11px] font-semibold leading-tight bg-background/90 rounded px-1 mt-0.5 truncate">
              {formatTime(minutesToTime(Math.max(dropPreview.startMin, 0)))} – {formatTime(minutesToTime(Math.max(dropPreview.endMin, 0)))}
              {dropPreview.conflict ? " · can't place here" : ""}
            </span>
          </div>
        )}

        {allItems.map((item) => {
          const itemEnd = timeToMinutes(item.end_time);
          const isPast = currentTimeMinutes !== null && itemEnd <= currentTimeMinutes;
          return (
            <ScheduledBlock
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onRemove={onRemoveItem && item.session_type !== "lunch" ? () => onRemoveItem(item.id) : undefined}
              onEdit={onEditItem && item.session_type !== "lunch" ? () => onEditItem(item) : undefined}
              isPast={isPast}
              isUpNext={!isPast && upNextId === item.id}
            />
          );
        })}
      </div>
    </div>
  );
}

export {
  TIME_SLOTS,
  GRID_START_MIN,
  GRID_END_MIN,
  GRID_HEIGHT,
  PX_PER_MIN,
  timeToMinutes,
  minutesToTime,
  formatTime,
  TYPE_COLORS,
  getColors,
};
