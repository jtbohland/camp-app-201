/** Pre-work deadline helpers. Deadlines are entered and shown in Pacific time. */

const PT = "America/Los_Angeles";

/** Offset of Pacific time from UTC (in minutes) at a given moment. Handles daylight saving. */
function pacificOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PT,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** "2026-11-16T09:00" read as Pacific wall-clock time → the real moment, or null if invalid. */
export function pacificToDate(local: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local ?? "");
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // Two passes settle the offset around daylight-saving changes.
  let t = guess - pacificOffsetMinutes(new Date(guess)) * 60000;
  t = guess - pacificOffsetMinutes(new Date(t)) * 60000;
  return new Date(t);
}

/** Default deadline for a cAMP start date ("YYYY-MM-DD"): that day at 9:00 AM PT. */
export function defaultDeadlineFor(startDate: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(startDate ?? "") ? `${startDate}T09:00` : "";
}

/** The effective deadline moment from the Settings values, or null when neither is set. */
export function effectiveDeadline(deadline: string, startDate: string): Date | null {
  return pacificToDate(deadline || defaultDeadlineFor(startDate));
}

/** A Pacific wall-clock value, shown like "Mon, Nov 16, 9:00 AM PT". */
export function formatPacific(local: string): string {
  const d = pacificToDate(local);
  if (!d) return local;
  return `${d.toLocaleString("en-US", { timeZone: PT, weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} PT`;
}
