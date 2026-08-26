import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetGraduationSummary",
  description: "Compiles a camper's full end-of-program stats for graduation",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
  }),
  output: z.object({
    camper_name: z.string(),
    team_name: z.string().nullable(),
    total_points: z.coerce.number(),
    rank: z.coerce.number(),
    total_campers: z.coerce.number(),
    badges_earned: z.coerce.number(),
    checkins_count: z.coerce.number(),
    surveys_completed: z.coerce.number(),
    prework_completed: z.coerce.number(),
    points_log_highlights: z.array(z.object({
      reason: z.string(),
      points: z.coerce.number(),
    })),
  }),
  async run(ctx, { camper_id }) {
    // Get camper info
    const CamperSchema = z.object({
      name: z.string(),
      team_name: z.string().nullable(),
      points: z.coerce.number(),
    });
    const camperInfo = await ctx.integrations.apps_database.query(
      `SELECT CONCAT(c.first_name, ' ', c.last_name) as name, t.name as team_name, c.points
       FROM camp201_campers c
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       WHERE c.id = $1 LIMIT 1`,
      CamperSchema,
      [camper_id],
      { label: "Get camper info" }
    );
    if (camperInfo.length === 0) {
      return { camper_name: "", team_name: null, total_points: 0, rank: 0, total_campers: 0, badges_earned: 0, checkins_count: 0, surveys_completed: 0, prework_completed: 0, points_log_highlights: [] };
    }

    // Get rank
    const CountSchema = z.object({ count: z.coerce.number() });
    const rankResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_campers WHERE points > (SELECT points FROM camp201_campers WHERE id = $1)`,
      CountSchema,
      [camper_id],
      { label: "Get rank" }
    );
    const totalResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_campers`,
      CountSchema,
      undefined,
      { label: "Get total campers" }
    );

    // Stats
    const badgesResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_camper_badges WHERE camper_id = $1`,
      CountSchema,
      [camper_id],
      { label: "Count badges" }
    );
    const checkinsResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_checkin_responses WHERE camper_id = $1`,
      CountSchema,
      [camper_id],
      { label: "Count check-ins" }
    );
    const surveysResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_survey_responses WHERE camper_id = $1`,
      CountSchema,
      [camper_id],
      { label: "Count surveys" }
    );
    const preworkResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_prework WHERE user_id = $1 AND completed = true`,
      CountSchema,
      [camper_id],
      { label: "Count prework" }
    );

    // Top point events
    const HighlightSchema = z.object({ reason: z.string(), points: z.coerce.number() });
    const highlights = await ctx.integrations.apps_database.query(
      `SELECT reason, points FROM camp201_points_log WHERE camper_id = $1 ORDER BY points DESC LIMIT 10`,
      HighlightSchema,
      [camper_id],
      { label: "Get point highlights" }
    );

    return {
      camper_name: camperInfo[0].name,
      team_name: camperInfo[0].team_name,
      total_points: camperInfo[0].points,
      rank: rankResult[0].count + 1,
      total_campers: totalResult[0].count,
      badges_earned: badgesResult[0].count,
      checkins_count: checkinsResult[0].count,
      surveys_completed: surveysResult[0].count,
      prework_completed: preworkResult[0].count,
      points_log_highlights: highlights,
    };
  },
});
