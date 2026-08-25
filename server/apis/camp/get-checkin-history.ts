import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetCheckInHistory",
  description: "Gets a camper's check-in history for their profile",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
  }),
  output: z.object({
    history: z.array(z.object({
      session_id: z.number(),
      label: z.string(),
      timing: z.string(),
      checked_in_at: z.string(),
      points_awarded: z.number(),
    })),
    stats: z.object({
      total_sessions: z.number(),
      early_count: z.number(),
      on_time_count: z.number(),
      late_count: z.number(),
      missed_count: z.number(),
    }),
  }),
  async run(ctx, { camper_id }) {
    const HistorySchema = z.object({
      session_id: z.number(),
      label: z.string(),
      timing: z.string(),
      checked_in_at: z.string(),
      points_awarded: z.number(),
    });

    const history = await ctx.integrations.apps_database.query(
      `SELECT r.session_id, s.label, r.timing, r.checked_in_at, r.points_awarded
       FROM camp201_checkin_responses r
       JOIN camp201_checkin_sessions s ON s.id = r.session_id
       WHERE r.camper_id = $1
       ORDER BY r.checked_in_at DESC
       LIMIT 50`,
      HistorySchema,
      [camper_id],
      { label: "Get camper check-in history" }
    );

    // Get stats
    const StatsSchema = z.object({
      total_sessions: z.coerce.number(),
      attended: z.coerce.number(),
      early_count: z.coerce.number(),
      on_time_count: z.coerce.number(),
      late_count: z.coerce.number(),
    });

    const stats = await ctx.integrations.apps_database.query(
      `SELECT
        (SELECT COUNT(*) FROM camp201_checkin_sessions WHERE status = 'closed') as total_sessions,
        COUNT(*) as attended,
        COUNT(*) FILTER (WHERE r.timing = 'early') as early_count,
        COUNT(*) FILTER (WHERE r.timing = 'on_time') as on_time_count,
        COUNT(*) FILTER (WHERE r.timing = 'late') as late_count
      FROM camp201_checkin_responses r
      WHERE r.camper_id = $1`,
      StatsSchema,
      [camper_id],
      { label: "Get camper check-in stats" }
    );

    const s = stats[0];
    return {
      history,
      stats: {
        total_sessions: s.total_sessions,
        early_count: s.early_count,
        on_time_count: s.on_time_count,
        late_count: s.late_count,
        missed_count: s.total_sessions - s.attended,
      },
    };
  },
});
