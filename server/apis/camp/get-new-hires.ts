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
  status: z.string(),
  cohort_id: z.coerce.number().nullable(),
  camper_id: z.coerce.number().nullable(),
  uploaded_at: z.string(),
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
      conditions.push(`cohort_id = $${idx++}`);
      params.push(cohort_id);
    }
    if (status) {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const hires = await ctx.integrations.camp_201_db.query(
      `SELECT * FROM camp201_new_hires ${where} ORDER BY last_name, first_name LIMIT 200`,
      HireSchema,
      params,
      { label: "Get new hires" }
    );

    const countResult = await ctx.integrations.camp_201_db.query(
      `SELECT COUNT(*)::int AS cnt FROM camp201_new_hires ${where}`,
      z.object({ cnt: z.coerce.number() }),
      params,
      { label: "Count new hires" }
    );

    return { hires, total: countResult[0].cnt };
  },
});
