/**
 * Which check-in sessions count toward attendance ("missed", "3/5 sessions", team check-in rate).
 *
 * Counselors run test check-ins during registration and pre-work. Those must never show up as
 * missed. A session counts only if it started on or after its cohort's cAMP start:
 *  - Active cohort: the `camp_start_date` setting (Hub → Pre-work settings), the same date that
 *    pre-work and surveys use. Blank = cAMP hasn't started, so no session counts yet.
 *  - Past cohorts: that cohort's own start_date (blank = every session counts).
 * Dates are midnight Pacific, matching the rest of the app.
 *
 * Returns a constant SQL condition (no user input), safe to inline. `alias` is the
 * camp201_checkin_sessions alias in the surrounding query.
 */
export function countedSessionSql(alias: string): string {
  return `EXISTS (
    SELECT 1 FROM camp201_cohorts co
    WHERE co.id = ${alias}.cohort_id
      AND ${alias}.started_at >= CASE
        WHEN co.is_active THEN
          (NULLIF(btrim((SELECT value FROM camp201_config WHERE key = 'camp_start_date' LIMIT 1)), '')::timestamp
            AT TIME ZONE 'America/Los_Angeles')
        ELSE COALESCE(co.start_date::timestamp AT TIME ZONE 'America/Los_Angeles', '-infinity'::timestamptz)
      END
  )`;
}
