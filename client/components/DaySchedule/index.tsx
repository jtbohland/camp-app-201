import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

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
  onClearDay?: (dayNumber: number) => void;
  showHeader?: boolean;
  currentTimeMinutes?: number | null;
};

const TIME_SLOTS: string[] = [];
for (let h = 8; h < 17; h++) {
  if (h === 8) {
    TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:30`);
  } else {
    TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:00`);
    TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:30`);
  }
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
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

function DroppableSlot({ slotTime, dayNumber }: { slotTime: string; dayNumber: number }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${dayNumber}-${slotTime}`,
    data: { dayNumber, slotTime },
  });

  return (
    <div
      ref={setNodeRef}
      className={`h-full w-full rounded border border-dashed transition-colors ${
        isOver ? "border-camp-green bg-camp-green/10" : "border-transparent hover:border-border"
      }`}
    />
  );
}

function ScheduledBlock({ item, isAdmin, onRemove, isPast, isUpNext }: { item: AgendaItem; isAdmin: boolean; onRemove?: () => void; isPast?: boolean; isUpNext?: boolean }) {
  const isDraggableItem = isAdmin && item.session_type !== "lunch";
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `agenda-${item.id}`,
    data: { agendaItem: item },
    disabled: !isDraggableItem,
  });

  const startMin = timeToMinutes(item.start_time);
  const endMin = timeToMinutes(item.end_time);
  const durationMin = endMin - startMin;
  const slotHeight = 40;
  const topOffset = ((startMin - 8.5 * 60) / 30) * slotHeight;
  const height = (durationMin / 30) * slotHeight;
  const colors = getColors(item.session_type);
  const isExec = item.session_type === "executive";

  const dragStyle = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={isDraggableItem ? setNodeRef : undefined}
      className={`absolute left-0 right-0 mx-1 rounded-md border px-2 py-1 overflow-hidden group ${colors.bg} ${colors.border} ${isDraggableItem ? "cursor-grab active:cursor-grabbing" : ""} ${isDragging ? "opacity-30 z-0" : "z-10"} ${isPast ? "opacity-40" : ""} ${isUpNext ? "ring-2 ring-amber-400 ring-offset-1" : ""}`}
      style={{ top: `${topOffset}px`, height: `${height - 2}px`, ...dragStyle }}
      {...(isDraggableItem ? attributes : {})}
      {...(isDraggableItem ? listeners : {})}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium truncate ${colors.text}`}>
            {isExec && "⭐ "}{isUpNext && "▶ "}{item.title}
          </p>
          {durationMin >= 45 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatTime(item.start_time)} – {formatTime(item.end_time)}
            </p>
          )}
          {isExec && (
            <p className="text-[9px] text-yellow-600 italic mt-0.5">Mandatory — all cAMPers expected</p>
          )}
        </div>
        {isAdmin && item.session_type !== "lunch" && (
          <Button
            size="sm" variant="ghost"
            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            onClick={onRemove}
          >
            <Icon icon="x" className="w-3 h-3 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function DaySchedule({ dayNumber, dayLabel, items, isAdmin, onRemoveItem, onClearDay, showHeader = true, currentTimeMinutes = null }: DayScheduleProps) {
  const slotHeight = 40;
  const totalSlots = TIME_SLOTS.length;
  const gridHeight = totalSlots * slotHeight;

  const lunchItem: AgendaItem = {
    id: -1, session_bank_id: null, day_number: dayNumber,
    start_time: "12:00", end_time: "13:00", title: "Lunch", session_type: "lunch",
  };

  const allItems = [...items, lunchItem];

  const isSlotOccupied = (slotTime: string): boolean => {
    const slotMin = timeToMinutes(slotTime);
    return allItems.some((item) => {
      const start = timeToMinutes(item.start_time);
      const end = timeToMinutes(item.end_time);
      return slotMin >= start && slotMin < end;
    });
  };

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

      <div className="relative" style={{ height: `${gridHeight}px` }}>
        {/* "Now" line */}
        {currentTimeMinutes !== null && currentTimeMinutes >= 510 && currentTimeMinutes <= 1020 && (
          <div
            className="absolute left-0 right-0 z-20 pointer-events-none"
            style={{ top: `${((currentTimeMinutes - 510) / 30) * slotHeight}px` }}
          >
            <div className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1" />
              <div className="flex-1 h-[2px] bg-red-500" />
            </div>
          </div>
        )}

        {TIME_SLOTS.map((slot, idx) => {
          const isHour = slot.endsWith(":00");
          return (
            <div
              key={slot}
              className={`absolute left-0 right-0 border-t ${isHour ? "border-border" : "border-border/30"}`}
              style={{ top: `${idx * slotHeight}px`, height: `${slotHeight}px` }}
            >
              {isAdmin && !isSlotOccupied(slot) && (
                <DroppableSlot slotTime={slot} dayNumber={dayNumber} />
              )}
            </div>
          );
        })}

        {allItems.map((item) => {
          const itemEnd = timeToMinutes(item.end_time);
          const itemStart = timeToMinutes(item.start_time);
          const isPast = currentTimeMinutes !== null && itemEnd <= currentTimeMinutes;
          const isUpNext = currentTimeMinutes !== null && !isPast && itemStart > currentTimeMinutes &&
            !allItems.some((other) => {
              const otherStart = timeToMinutes(other.start_time);
              const otherEnd = timeToMinutes(other.end_time);
              return otherEnd <= currentTimeMinutes! && false; // skip past
            }) &&
            allItems.filter((o) => timeToMinutes(o.start_time) > currentTimeMinutes!)
              .sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time))[0]?.id === item.id;

          return (
            <ScheduledBlock
              key={item.id}
              item={item}
              isAdmin={isAdmin}
              onRemove={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
              isPast={isPast}
              isUpNext={isUpNext}
            />
          );
        })}
      </div>
    </div>
  );
}

export { TIME_SLOTS, timeToMinutes, formatTime, TYPE_COLORS, getColors };
