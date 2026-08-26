import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const TeamMetricSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  total_points: z.coerce.number(),
  member_count: z.coerce.number(),
  avg_points: z.coerce.number(),
  checkin_rate: z.coerce.number(),
});

export default api({
  name: "GetAdminTeams",
  description: "Gets all teams with aggregate metrics for admin view",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    cohort_id: z.number().nullable(),
  }),
  output: z.object({
    teams: z.array(TeamMetricSchema),
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

    const cohortFilter = effectiveCohortId ? `AND t.cohort_id = $1` : ``;
    const params = effectiveCohortId ? [effectiveCohortId] : undefined;

    const teams = await ctx.integrations.apps_database.query(
      `SELECT t.id, t.name,
              COALESCE(SUM(c.points), 0)::int as total_points,
              COUNT(c.id)::int as member_count,
              COALESCE(AVG(c.points), 0)::int as avg_points,
              CASE
                WHEN COUNT(c.id) = 0 THEN 0
                ELSE COALESCE(
                  (SELECT COUNT(*)::float FROM camp201_checkin_responses cr WHERE cr.camper_id = ANY(ARRAY_AGG(c.id)))
                  / NULLIF(COUNT(c.id) * (SELECT COUNT(*) FROM camp201_checkin_sessions WHERE status = 'closed'), 0)
                  * 100, 0
                )::int
              END as checkin_rate
       FROM camp201_teams t
       LEFT JOIN camp201_campers c ON c.team_id = t.id AND c.role != 'counselor'
       WHERE 1=1 ${cohortFilter}
       GROUP BY t.id
       ORDER BY total_points DESC
       LIMIT 50`,
      TeamMetricSchema,
      params,
      { label: "Get teams with metrics" }
    );

    return { teams };
  },
});
