/** Shared types + pure helpers for the counselor Presentations board. */

export type ScheduleItem = {
  id: number;
  title: string;
  description: string | null;
  instructions: string | null;
  resources: unknown;
  prep_time_minutes: number | null;
  present_time_minutes: number | null;
  /** null = in the bank (hidden from cAMPers). */
  day_number: number | null;
  sort_order: number;
  status: string;
  is_locked: boolean;
  deck_template_url: string | null;
  presentation_type: string;
};

/** Where a card lives on the board: a day number, or "bank". */
export type Slot = number | "bank";

export const DAY_NAMES: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
};

export const dayLabel = (day: number) => `Day ${day} · ${DAY_NAMES[day] ?? ""}`.trim();

export const slotOf = (item: ScheduleItem): Slot => item.day_number ?? "bank";

export const TYPE_LABELS: Record<string, string> = {
  standard: "Solo",
  bingo: "Bingo",
  team_presentation: "Team Presentation",
  team_workshop: "Workshop",
  hackathon: "Hackathon",
};

/** Items in one slot, in display order. */
export function itemsIn(items: ScheduleItem[], slot: Slot): ScheduleItem[] {
  return items
    .filter((i) => slotOf(i) === slot)
    .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
}

/**
 * Moves one card to `slot` at position `index` (end if omitted), then renumbers every slot 1..n.
 * Returns the new item list; nothing is mutated.
 */
export function moveItem(items: ScheduleItem[], id: number, slot: Slot, index?: number): ScheduleItem[] {
  const moving = items.find((i) => i.id === id);
  if (!moving) return items;
  const day = slot === "bank" ? null : slot;
  const target = itemsIn(items, slot).filter((i) => i.id !== id);
  const at = index === undefined ? target.length : Math.max(0, Math.min(index, target.length));
  target.splice(at, 0, { ...moving, day_number: day });

  const order = new Map<number, { day: number | null; sort: number }>();
  target.forEach((i, idx) => order.set(i.id, { day, sort: idx + 1 }));
  const fromSlot = slotOf(moving);
  if (fromSlot !== slot) {
    itemsIn(items, fromSlot)
      .filter((i) => i.id !== id)
      .forEach((i, idx) => order.set(i.id, { day: i.day_number, sort: idx + 1 }));
  }
  return items.map((i) => {
    const o = order.get(i.id);
    return o ? { ...i, day_number: o.day, sort_order: o.sort } : i;
  });
}

/** Cards on days that no longer exist on the Agenda (e.g. days cut from 5 to 3). */
export const outOfRange = (items: ScheduleItem[], numDays: number) =>
  items.filter((i) => i.day_number !== null && i.day_number > numDays);
