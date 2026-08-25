import { useDroppable } from "@dnd-kit/core";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
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
};

// Generate time slots from 9:00 to 17:00 in 30-min increments
const TIME_SLOTS: string[] = [];
for (let h = 9; h < 17; h++) {
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${h.toString().padStart(2, "0")}:30`);
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

function DroppableSlot({
  slotTime,
  dayNumber,
  isLunch,
}: {
  slotTime: string;
  dayNumber: number;
  isLunch: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${dayNumber}-${slotTime}`,
    data: { dayNumber, slotTime },
    disabled: isLunch,
  });

  if (isLunch) return null; // Lunch slots are occupied by the lunch block

  return (
    <div
      ref={setNodeRef}
      className={`h-full w-full rounded border border-dashed transition-colors ${
        isOver
          ? "border-camp-green bg-camp-green/10"
          : "border-transparent hover:border-border"
      }`}
    />
  );
}

function ScheduledBlock({
  item,
  isAdmin,
  onRemove,
}: {
  item: AgendaItem;
  isAdmin: boolean;
  onRemove?: () => void;
}) {
  const startMin = timeToMinutes(item.start_time);
  const endMin = timeToMinutes(item.end_time);
  const durationMin = endMin - startMin;
  const slotHeight = 40; // px per 30-min slot
  const topOffset = ((startMin - 9 * 60) / 30) * slotHeight;
  const height = (durationMin / 30) * slotHeight;

  const bgColor =
    item.session_type === "lunch"
      ? "bg-camp-amber/15 border-camp-amber/30"
      : item.session_type === "break"
      ? "bg-muted/80 border-border"
      : "bg-camp-green/10 border-camp-green/30";

  const textColor =
    item.session_type === "lunch"
      ? "text-camp-amber"
      : item.session_type === "break"
      ? "text-muted-foreground"
      : "text-camp-green";

  return (
    <div
      className={`absolute left-0 right-0 mx-1 rounded-md border px-2 py-1 overflow-hidden group ${bgColor}`}
      style={{ top: `${topOffset}px`, height: `${height - 2}px` }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium truncate ${textColor}`}>{item.title}</p>
          {durationMin >= 45 && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {formatTime(item.start_time)} – {formatTime(item.end_time)}
            </p>
          )}
        </div>
        {isAdmin && item.session_type !== "lunch" && (
          <Button
            size="sm"
            variant="ghost"
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

export default function DaySchedule({ dayNumber, dayLabel, items, isAdmin, onRemoveItem }: DayScheduleProps) {
  const slotHeight = 40;
  const totalSlots = TIME_SLOTS.length; // 16 slots (9:00–16:30)
  const gridHeight = totalSlots * slotHeight;

  // Lunch is always 12:00–13:00
  const lunchItem: AgendaItem = {
    id: -1,
    session_bank_id: null,
    day_number: dayNumber,
    start_time: "12:00",
    end_time: "13:00",
    title: "Lunch",
    session_type: "lunch",
  };

  const allItems = [...items, lunchItem];

  // Determine which slots are occupied (for droppable logic)
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
      {/* Day header */}
      <div className="text-center py-2 border-b border-border bg-muted/30 rounded-t-lg">
        <span className="text-sm font-semibold">{dayLabel}</span>
      </div>

      {/* Time grid */}
      <div className="relative" style={{ height: `${gridHeight}px` }}>
        {/* Grid lines */}
        {TIME_SLOTS.map((slot, idx) => {
          const isHour = slot.endsWith(":00");
          return (
            <div
              key={slot}
              className={`absolute left-0 right-0 border-t ${
                isHour ? "border-border" : "border-border/30"
              }`}
              style={{ top: `${idx * slotHeight}px`, height: `${slotHeight}px` }}
            >
              {/* Droppable zone for admin */}
              {isAdmin && !isSlotOccupied(slot) && (
                <DroppableSlot slotTime={slot} dayNumber={dayNumber} isLunch={false} />
              )}
            </div>
          );
        })}

        {/* Scheduled blocks */}
        {allItems.map((item) => (
          <ScheduledBlock
            key={item.id}
            item={item}
            isAdmin={isAdmin}
            onRemove={onRemoveItem ? () => onRemoveItem(item.id) : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export { TIME_SLOTS, timeToMinutes, formatTime };
