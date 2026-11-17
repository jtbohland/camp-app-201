import { z } from "@superblocksteam/sdk-api";

/**
 * Daily survey day states. One config key per day, `survey_day_N_locked`:
 *   'true'  = closed by a counselor (not open yet, or closed). No submissions, no "missed" nag.
 *   'open'  = reopened by a counselor after its deadline. Open and on time until locked again.
 *   'false' / missing = automatic: on time until 9:00 AM Pacific the morning after, then late.
 */
export type SurveyDayMode = "locked" | "open" | "auto";

export type SurveyDayState = {
  day_number: number;
  mode: SurveyDayMode;
  /** 9:00 AM Pacific the morning after this day, or null when no cAMP start date is set. */
  deadline: Date | null;
  /** Submissions are blocked entirely (counselor lock). */
  locked: boolean;
  /** Submitting now counts as late (automatic day past its deadline). */
  late: boolean;
};

/** UTC offset (minutes) of America/Los_Angeles at a given instant. */
function laOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** 9:00 AM Pacific on (startDate + dayNumber days). startDate is 'YYYY-MM-DD'. */
export function surveyDeadline(startDate: string, dayNumber: number): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(startDate.trim());
  if (!m) return null;
  const naive = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + dayNumber, 9, 0, 0);
  // Interpret 9:00 as Pacific wall-clock time (handles PST/PDT).
  const guess = new Date(naive - laOffsetMinutes(new Date(naive)) * 60000);
  const fixed = new Date(naive - laOffsetMinutes(guess) * 60000);
  return Number.isNaN(fixed.getTime()) ? null : fixed;
}

export async function getCampStartDate(db: any): Promise<string> {
  const rows = await db.query(
    `SELECT value FROM camp201_config WHERE key = 'camp_start_date' LIMIT 1`,
    z.object({ value: z.string().nullable() }), undefined, { label: "Get camp start date" }
  );
  return rows[0]?.value ?? "";
}

/** State of every survey day (1..numDays) right now. */
export async function getSurveyDayStates(db: any, numDays: number): Promise<SurveyDayState[]> {
  const [startDate, lockRows] = await Promise.all([
    getCampStartDate(db),
    db.query(
      `SELECT key, value FROM camp201_config WHERE key LIKE 'survey\\_day\\_%\\_locked' LIMIT 20`,
      z.object({ key: z.string(), value: z.string().nullable() }), undefined,
      { label: "Get survey day locks" }
    ),
  ]);
  const modes = new Map<number, SurveyDayMode>();
  for (const r of lockRows as { key: string; value: string | null }[]) {
    const match = r.key.match(/survey_day_(\d+)_locked/);
    if (!match) continue;
    modes.set(Number(match[1]), r.value === "true" ? "locked" : r.value === "open" ? "open" : "auto");
  }
  const now = Date.now();
  return Array.from({ length: Math.max(numDays, 0) }, (_, i) => {
    const day = i + 1;
    const mode = modes.get(day) ?? "auto";
    const deadline = startDate ? surveyDeadline(startDate, day) : null;
    return {
      day_number: day,
      mode,
      deadline,
      locked: mode === "locked",
      late: mode === "auto" && deadline !== null && now > deadline.getTime(),
    };
  });
}

export async function getSurveyDayState(db: any, day: number): Promise<SurveyDayState> {
  const states = await getSurveyDayStates(db, Math.max(day, 1));
  return states[day - 1];
}
