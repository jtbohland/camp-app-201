import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const HireSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role_title: z.string().nullable(),
  region: z.string().nullable(),
  manager_name: z.string().nullable(),
  manager_email: z.string().nullable(),
  country: z.string().nullable(),
  /** YYYY-MM-DD */
  start_date: z.string().nullable(),
  notes: z.string().nullable(),
  status: z.string(),
  cohort_id: z.coerce.number().nullable(),
  camper_id: z.coerce.number().nullable(),
  uploaded_at: z.string(),
  /** The exact official title from the CSV, e.g. "Major Enterprise Account Executive". */
  original_title: z.string().nullable(),
  /** The CSV title didn't match a standard role: a counselor needs to pick one. */
  role_needs_review: z.boolean(),
  /** The role the cAMPer picked at registration, when it differs from the CSV role. */
  registered_role: z.string().nullable(),
});

export default api({
  name: "GetNewHires",
  description: "Returns all new hires from the staging table, with optional status filter",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    cohort_id: z.number().nullable(),
    status: z.string().nullable(),
  }),
  output: z.object({ hires: z.array(HireSchema), total: z.coerce.number() }),
  async run(ctx, { cohort_id, status }) {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (cohort_id) {
      conditions.push(`nh.cohort_id = $${idx++}`);
      params.push(cohort_id);
    }
    if (status) {
      conditions.push(`nh.status = $${idx++}`);
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const hires = await ctx.integrations.camp_201_db.query(
      `SELECT nh.id, nh.first_name, nh.last_name, nh.email, nh.role_title, nh.region, nh.manager_name,
              nh.manager_email, nh.country, nh.start_date::text AS start_date, nh.notes, nh.status, nh.cohort_id, nh.camper_id, nh.uploaded_at,
              nh.original_title, COALESCE(nh.role_needs_review, false) AS role_needs_review,
              CASE WHEN c.id IS NOT NULL AND c.role NOT IN ('counselor', 'admin')
                        AND nh.role_needs_review = false
                        AND camp201_map_role(c.role) = c.role
                        AND c.role IS DISTINCT FROM nh.role_title
                   THEN c.role END AS registered_role
       FROM camp201_new_hires nh
       LEFT JOIN camp201_campers c ON lower(c.email) = lower(nh.email) AND c.removed_at IS NULL
       ${where}
       ORDER BY LOWER(nh.last_name), LOWER(nh.first_name) LIMIT 200`,
      HireSchema,
      params,
      { label: "Get new hires" }
    );

    const countResult = await ctx.integrations.camp_201_db.query(
      `SELECT COUNT(*)::int AS cnt FROM camp201_new_hires nh ${where}`,
      z.object({ cnt: z.coerce.number() }),
      params,
      { label: "Count new hires" }
    );

    return { hires, total: countResult[0].cnt };
  },
});
