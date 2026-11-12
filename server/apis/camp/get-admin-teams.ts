import { api, z, postgres } from "@superblocksteam/sdk-api";
import { resolveViewCohort } from "../../lib/cohort.js";
import { countedSessionSql } from "../../lib/checkin-sessions.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const TeamMetricSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  total_points: z.coerce.number(),
  member_count: z.coerce.number(),
  avg_points: z.coerce.number(),
  checkin_rate: z.coerce.number(),
  /** Company this team presents on (Zillow, Coursera…), set in Team Generator → Company assignment. */
  assigned_company: z
    .object({ name: z.string(), emoji: z.string().nullable().optional(), color: z.string().nullable().optional() })
    .passthrough()
    .nullable(),
});

export default api({
  name: "GetAdminTeams",
  description: "Gets all teams with aggregate metrics for admin view",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    cohort_id: z.number().nullable(),
  }),
  output: z.object({
    teams: z.array(TeamMetricSchema),
  }),
  async run(ctx, { cohort_id }) {
    // If no cohort specified, use active
    // No cohort passed: use the viewing cohort (active, or a counselor's chosen past cohort)
    let effectiveCohortId = cohort_id;
    if (!effectiveCohortId) {
      effectiveCohortId = (await resolveViewCohort(ctx.integrations.camp_201_db, ctx.user.email)).cohortId;
    }

    const cohortFilter = effectiveCohortId ? `AND t.cohort_id = $1` : ``;
    const params = effectiveCohortId ? [effectiveCohortId] : undefined;

    const teams = await ctx.integrations.camp_201_db.query(
      `SELECT t.id, t.name, t.assigned_company,
              COALESCE(SUM(c.points), 0)::int + COALESCE(t.team_points, 0) as total_points,
              COUNT(c.id)::int as member_count,
              COALESCE(AVG(c.points), 0)::int as avg_points,
              CASE
                WHEN COUNT(c.id) = 0 THEN 0
                ELSE COALESCE(
                  (SELECT COUNT(*)::float FROM camp201_checkin_responses cr
                     JOIN camp201_checkin_sessions s ON s.id = cr.session_id
                     WHERE cr.camper_id = ANY(ARRAY_AGG(c.id)) AND s.status = 'closed'
                       AND s.cohort_id = t.cohort_id AND ${countedSessionSql("s")})
                  / NULLIF(COUNT(c.id) * (SELECT COUNT(*) FROM camp201_checkin_sessions s
                     WHERE s.status = 'closed' AND s.cohort_id = t.cohort_id AND ${countedSessionSql("s")}), 0)
                  * 100, 0
                )::int
              END as checkin_rate
       FROM camp201_teams t
       LEFT JOIN camp201_campers c ON c.team_id = t.id AND c.role != 'counselor'
       WHERE 1=1 ${cohortFilter}
       GROUP BY t.id, t.team_points, t.cohort_id, t.assigned_company
       ORDER BY total_points DESC
       LIMIT 50`,
      TeamMetricSchema,
      params,
      { label: "Get teams with metrics" }
    );

    return { teams };
  },
});
