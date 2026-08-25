import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "StartCheckIn",
  description: "Counselor starts a check-in session linked to a timer",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    label: z.string(),
    duration_minutes: z.number(),
    counselor_id: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
    session_id: z.number(),
    checkin_opens_at: z.string(),
    timer_ends_at: z.string(),
  }),
  async run(ctx, input) {
    const { label, duration_minutes, counselor_id } = input;

    // Get active cohort
    const CohortIdSchema = z.object({ id: z.coerce.number() });
    const activeCohort = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortIdSchema,
      undefined,
      { label: "Get active cohort" }
    );
    const cohortId = activeCohort.length > 0 ? activeCohort[0].id : null;

    // Calculate check-in window based on break length
    let windowSeconds: number;
    if (duration_minutes <= 5) {
      windowSeconds = 120; // last 2 min
    } else if (duration_minutes <= 10) {
      windowSeconds = 180; // last 3 min
    } else {
      windowSeconds = 300; // last 5 min (cap)
    }

    const now = new Date();
    const timerEndsAt = new Date(now.getTime() + duration_minutes * 60 * 1000);
    const checkinOpensAt = new Date(timerEndsAt.getTime() - windowSeconds * 1000);

    const SessionSchema = z.object({ id: z.number() });
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_checkin_sessions (label, duration_minutes, checkin_window_seconds, timer_ends_at, checkin_opens_at, created_by, cohort_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      SessionSchema,
      [label, duration_minutes, windowSeconds, timerEndsAt.toISOString(), checkinOpensAt.toISOString(), counselor_id, cohortId],
      { label: "Create check-in session" }
    );

    return {
      success: true,
      session_id: result[0].id,
      checkin_opens_at: checkinOpensAt.toISOString(),
      timer_ends_at: timerEndsAt.toISOString(),
    };
  },
});
