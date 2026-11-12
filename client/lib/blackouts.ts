import { STANDARD_ROLES } from "@/lib/roles.js";

/** A required (blackout) session as returned by the blackout APIs. */
export type BlackoutSession = {
  agenda_id: number;
  title: string;
  day_number: number;
  start_time: string;
  end_time: string;
  roles: string[];
  starts_at: string | null;
  ends_at: string | null;
};

/** "Everyone", "SDR", "SDR, SE +2 more". Empty = every role. */
export function blackoutAudienceLabel(roles: readonly string[], max = 2): string {
  if (roles.length === 0 || roles.length >= STANDARD_ROLES.length) return "Everyone";
  if (roles.length <= max) return roles.join(", ");
  return `${roles.slice(0, max).join(", ")} +${roles.length - max} more`;
}

const DAY_NAMES: Record<number, string> = { 1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday" };

function hhmm(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

/** "Monday, Nov 16 · 9:00 AM – 10:30 AM PT" (date only when the cAMP start date is set). */
export function blackoutWhen(s: Pick<BlackoutSession, "day_number" | "start_time" | "end_time" | "starts_at">): string {
  const day = DAY_NAMES[s.day_number] ?? `Day ${s.day_number}`;
  const date = s.starts_at
    ? new Date(s.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Los_Angeles" })
    : null;
  return `${day}${date ? `, ${date}` : ""} · ${hhmm(s.start_time)} – ${hhmm(s.end_time)} PT`;
}

/** Client-side preview of the server check: required sessions that overlap [start, end). */
export function overlapping(sessions: readonly BlackoutSession[], start: Date, end: Date): BlackoutSession[] {
  const s = start.getTime();
  const e = end.getTime();
  if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return [];
  return sessions.filter((b) => b.starts_at && b.ends_at && s < Date.parse(b.ends_at) && e > Date.parse(b.starts_at));
}

export const BLACKOUT_REMINDER =
  "As a reminder, the cAMP 201 invite asked everyone to 🙏 free up your calendar and reschedule meetings. Your presence is expected at cAMP.";
