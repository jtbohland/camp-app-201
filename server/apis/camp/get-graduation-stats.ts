import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetGraduationStats",
  description: "Compiles end-of-program stats for a camper's graduation summary",
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
    leaderboard_rank: z.coerce.number(),
    total_campers: z.coerce.number(),
    badges_earned: z.coerce.number(),
    checkins_completed: z.coerce.number(),
    surveys_completed: z.coerce.number(),
    prework_completed: z.coerce.number(),
    feedback_given: z.coerce.number(),
    top_badge: z.string().nullable(),
    team_rank: z.coerce.number().nullable(),
    team_points: z.coerce.number().nullable(),
  }),
  async run(ctx, { camper_id }) {
    const CamperSchema = z.object({ first_name: z.string(), last_name: z.string(), points: z.coerce.number(), team_name: z.string().nullable() });
    const camper = await ctx.integrations.apps_database.query(
      `SELECT c.first_name, c.last_name, c.points,
              t.name as team_name
       FROM camp201_campers c
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       WHERE c.id = $1 LIMIT 1`,
      CamperSchema,
      [camper_id],
      { label: "Get camper info" }
    );
    if (camper.length === 0) {
      return {
        camper_name: "", team_name: null, total_points: 0, leaderboard_rank: 0,
        total_campers: 0, badges_earned: 0, checkins_completed: 0,
        surveys_completed: 0, prework_completed: 0, feedback_given: 0,
        top_badge: null, team_rank: null, team_points: null,
      };
    }

    const { first_name, last_name, points, team_name } = camper[0];
    const CountSchema = z.object({ count: z.coerce.number() });

    // Rank
    const rankResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_campers WHERE points > (SELECT points FROM camp201_campers WHERE id = $1)`,
      CountSchema, [camper_id], { label: "Calculate rank" }
    );
    const rank = rankResult[0].count + 1;

    const totalResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_campers`, CountSchema, undefined, { label: "Total campers" }
    );

    // Badges earned
    const badgesResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_camper_badges WHERE camper_id = $1`,
      CountSchema, [camper_id], { label: "Badge count" }
    );

    // Check-ins
    const checkinsResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_checkin_responses WHERE camper_id = $1`,
      CountSchema, [camper_id], { label: "Checkin count" }
    );

    // Surveys
    const surveysResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_survey_responses WHERE camper_id = $1`,
      CountSchema, [camper_id], { label: "Survey count" }
    );

    // Prework
    const preworkResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_prework WHERE camper_id = $1 AND completed = true`,
      CountSchema, [camper_id], { label: "Prework count" }
    );

    // Top badge
    const TopBadgeSchema = z.object({ name: z.string() });
    const topBadgeResult = await ctx.integrations.apps_database.query(
      `SELECT b.name FROM camp201_camper_badges cb JOIN camp201_badges b ON b.id = cb.badge_id
       WHERE cb.camper_id = $1 ORDER BY b.points_reward DESC LIMIT 1`,
      TopBadgeSchema, [camper_id], { label: "Top badge" }
    );

    return {
      camper_name: `${first_name} ${last_name}`,
      team_name,
      total_points: points,
      leaderboard_rank: rank,
      total_campers: totalResult[0].count,
      badges_earned: badgesResult[0].count,
      checkins_completed: checkinsResult[0].count,
      surveys_completed: surveysResult[0].count,
      prework_completed: preworkResult[0].count,
      feedback_given: 0,
      top_badge: topBadgeResult.length > 0 ? topBadgeResult[0].name : null,
      team_rank: null,
      team_points: null,
    };
  },
});
