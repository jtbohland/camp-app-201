import { GRID_START_MIN, GRID_END_MIN, timeToMinutes, minutesToTime, formatTime, type AgendaItem } from "@/components/DaySchedule";

const LUNCH_START = 12 * 60;
const LUNCH_END = 13 * 60;

/**
 * Returns a plain-language reason the slot can't be used, or null if it's free.
 * `excludeId` skips the item being moved/edited so it doesn't conflict with itself.
 */
export function findSlotConflict(
  items: AgendaItem[],
  dayNumber: number,
  startMin: number,
  endMin: number,
  excludeId?: number
): string | null {
  if (startMin < GRID_START_MIN) return `Starts before ${formatTime(minutesToTime(GRID_START_MIN))}`;
  if (endMin > GRID_END_MIN) {
    return `Runs past ${formatTime(minutesToTime(GRID_END_MIN))} (would end ${formatTime(minutesToTime(endMin))})`;
  }
  if (endMin <= startMin) return "Length must be more than 0 minutes";

  const clash = items.find(
    (i) =>
      i.day_number === dayNumber &&
      i.id !== excludeId &&
      startMin < timeToMinutes(i.end_time) &&
      endMin > timeToMinutes(i.start_time)
  );
  if (clash) {
    return `Overlaps "${clash.title}" (${formatTime(clash.start_time)} – ${formatTime(clash.end_time)})`;
  }

  if (startMin < LUNCH_END && endMin > LUNCH_START) return "Overlaps Lunch (12:00 PM – 1:00 PM)";
  return null;
}

/** Viewport point for a pointer, mouse, or touch event. */
export function eventPoint(e: Event | null | undefined): { x: number; y: number } | null {
  if (!e) return null;
  if ("touches" in e) {
    const t = (e as TouchEvent).touches[0] ?? (e as TouchEvent).changedTouches[0];
    return t ? { x: t.clientX, y: t.clientY } : null;
  }
  if ("clientX" in e) return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  return null;
}
