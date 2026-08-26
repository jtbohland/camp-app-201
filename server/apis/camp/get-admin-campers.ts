import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const CamperMetricSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role: z.string(),
  team_id: z.coerce.number().nullable(),
  team_name: z.string().nullable(),
  points: z.coerce.number(),
  profile_completed: z.boolean(),
  goal_1: z.string().nullable(),
  goal_2: z.string().nullable(),
  goal_3: z.string().nullable(),
  goal_1_achieved: z.boolean(),
  goal_2_achieved: z.boolean(),
  goal_3_achieved: z.boolean(),
  checkin_count: z.coerce.number(),
  early_count: z.coerce.number(),
  late_count: z.coerce.number(),
  created_at: z.string(),
});

export default api({
  name: "GetAdminCampers",
  description: "Gets all campers with metrics for admin dashboard, filtered by cohort",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    cohort_id: z.number().nullable(),
  }),
  output: z.object({
    campers: z.array(CamperMetricSchema),
    total_points: z.coerce.number(),
    total_campers: z.coerce.number(),
  }),
  async run(ctx, { cohort_id }) {
    // If no cohort specified, use active
    let effectiveCohortId = cohort_id;
    if (!effectiveCohortId) {
      const ActiveSchema = z.object({ id: z.coerce.number() });
      const active = await ctx.integrations.apps_database.query(
        `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
        ActiveSchema,
        undefined,
        { label: "Get active cohort" }
      );
      effectiveCohortId = active.length > 0 ? active[0].id : null;
    }

    const cohortFilter = effectiveCohortId ? `AND c.cohort_id = $1` : ``;
    const params = effectiveCohortId ? [effectiveCohortId] : undefined;

    const campers = await ctx.integrations.apps_database.query(
      `SELECT c.id, c.first_name, c.last_name, c.email, c.role, c.team_id,
              t.name as team_name, c.points, c.profile_completed,
              c.goal_1, c.goal_2, c.goal_3,
              c.goal_1_achieved, c.goal_2_achieved, c.goal_3_achieved,
              COALESCE(cr.checkin_count, 0)::int as checkin_count,
              COALESCE(cr.early_count, 0)::int as early_count,
              COALESCE(cr.late_count, 0)::int as late_count,
              c.created_at
       FROM camp201_campers c
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       LEFT JOIN LATERAL (
         SELECT COUNT(*) as checkin_count,
                COUNT(*) FILTER (WHERE timing = 'early') as early_count,
                COUNT(*) FILTER (WHERE timing = 'late') as late_count
         FROM camp201_checkin_responses WHERE camper_id = c.id
       ) cr ON true
       WHERE c.role != 'counselor' ${cohortFilter}
       ORDER BY c.points DESC, c.last_name ASC
       LIMIT 100`,
      CamperMetricSchema,
      params,
      { label: "Get all campers with metrics" }
    );

    const totalPoints = campers.reduce((sum, c) => sum + c.points, 0);

    return {
      campers,
      total_points: totalPoints,
      total_campers: campers.length,
    };
  },
});
