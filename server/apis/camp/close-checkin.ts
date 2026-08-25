import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "CloseCheckIn",
  description: "Counselor closes a check-in session and calculates final scores",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    session_id: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
    summary: z.object({
      total_checked_in: z.number(),
      total_campers: z.number(),
      early_count: z.number(),
      on_time_count: z.number(),
      late_count: z.number(),
      missed_count: z.number(),
      first_team_name: z.string().nullable(),
    }),
  }),
  async run(ctx, { session_id }) {
    // Close the session
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_checkin_sessions SET status = 'closed', closed_at = NOW() WHERE id = $1`,
      [session_id],
      { label: "Close check-in session" }
    );

    // Get summary stats
    const StatsSchema = z.object({
      total_checked_in: z.coerce.number(),
      early_count: z.coerce.number(),
      on_time_count: z.coerce.number(),
      late_count: z.coerce.number(),
    });
    const stats = await ctx.integrations.apps_database.query(
      `SELECT
        COUNT(*) as total_checked_in,
        COUNT(*) FILTER (WHERE timing = 'early') as early_count,
        COUNT(*) FILTER (WHERE timing = 'on_time') as on_time_count,
        COUNT(*) FILTER (WHERE timing = 'late') as late_count
      FROM camp201_checkin_responses WHERE session_id = $1`,
      StatsSchema,
      [session_id],
      { label: "Get check-in stats" }
    );

    const TotalSchema = z.object({ total: z.coerce.number() });
    const totalResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*) as total FROM camp201_campers WHERE role != 'counselor'`,
      TotalSchema,
      undefined,
      { label: "Get total campers" }
    );

    // Get first team name
    const TeamSchema = z.object({ name: z.string() });
    const firstTeam = await ctx.integrations.apps_database.query(
      `SELECT t.name FROM camp201_teams t
       JOIN camp201_checkin_sessions s ON s.first_team_id = t.id
       WHERE s.id = $1 LIMIT 1`,
      TeamSchema,
      [session_id],
      { label: "Get first team name" }
    );

    const totalCampers = totalResult[0]?.total ?? 0;
    const s = stats[0];

    return {
      success: true,
      summary: {
        total_checked_in: s.total_checked_in,
        total_campers: totalCampers,
        early_count: s.early_count,
        on_time_count: s.on_time_count,
        late_count: s.late_count,
        missed_count: totalCampers - s.total_checked_in,
        first_team_name: firstTeam.length > 0 ? firstTeam[0].name : null,
      },
    };
  },
});
