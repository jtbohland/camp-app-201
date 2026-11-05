import { api, z, postgres } from "@superblocksteam/sdk-api";
import { resolveViewCohort } from "../../lib/cohort.js";
import { MANAGER_NAME_SQL } from "../../lib/regions.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const CamperMetricSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role: z.string(),
  team_id: z.coerce.number().nullable(),
  team_name: z.string().nullable(),
  team_color: z.string().nullable(),
  team_logo_url: z.string().nullable(),
  manager: z.string().nullable(),
  manager_email: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  photo_url: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  fun_fact: z.string().nullable(),
  start_date: z.string().nullable(),
  absences_used: z.coerce.number(),
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
    camp_201_db: postgres(APPS_DB),
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
    // No cohort passed: use the viewing cohort (active, or a counselor's chosen past cohort)
    let effectiveCohortId = cohort_id;
    if (!effectiveCohortId) {
      effectiveCohortId = (await resolveViewCohort(ctx.integrations.camp_201_db, ctx.user.email)).cohortId;
    }

    const cohortFilter = effectiveCohortId ? `AND c.cohort_id = $1` : ``;
    const params = effectiveCohortId ? [effectiveCohortId] : undefined;

    const campers = await ctx.integrations.camp_201_db.query(
      `SELECT c.id, c.first_name, c.last_name, c.email, c.role, c.team_id,
              t.name as team_name, t.color AS team_color, t.logo_url AS team_logo_url,
              ${MANAGER_NAME_SQL} AS manager,
              c.manager_email, c.region, c.country, c.city, c.photo_url, c.linkedin_url, c.fun_fact,
              c.start_date::text AS start_date,
              (SELECT COUNT(*) FROM camp201_absence_requests ar
                WHERE ar.camper_id = c.id AND COALESCE(ar.status, 'approved') = 'approved'
                  AND COALESCE(ar.approval_type, 'standard') = 'standard'
                  AND (ar.cohort_id IS NULL OR ar.cohort_id = c.cohort_id))::int AS absences_used,
              c.points, c.profile_completed,
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
       WHERE c.role != 'counselor' AND c.removed_at IS NULL ${cohortFilter}
       ORDER BY c.points DESC, c.last_name ASC
       LIMIT 100`,
      CamperMetricSchema,
      params,
      { label: "Get all campers with metrics" }
    );

    const totalPoints = campers.reduce((sum, c) => sum + c.points, 0);

    // "first.last@amplitude.com" → "First Last" when no manager name is on file.
    const nameFromEmail = (email: string | null) => {
      const local = email?.split("@")[0]?.trim();
      if (!local) return null;
      return local.split(/[._-]+/).filter(Boolean).map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(" ");
    };

    return {
      campers: campers.map((c) => (c.manager ? c : { ...c, manager: nameFromEmail(c.manager_email) })),
      total_points: totalPoints,
      total_campers: campers.length,
    };
  },
});
