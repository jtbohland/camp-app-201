import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const CohortSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.string(),
  camper_count: z.coerce.number(),
});

export default api({
  name: "GetCohorts",
  description: "Lists all cohorts with camper counts",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    cohorts: z.array(CohortSchema),
    active_cohort: CohortSchema.nullable(),
  }),
  async run(ctx) {
    const cohorts = await ctx.integrations.camp_201_db.query(
      `SELECT c.id, c.name, c.start_date, c.end_date, c.is_active, c.created_at,
              COUNT(cm.id)::int as camper_count
       FROM camp201_cohorts c
       LEFT JOIN camp201_campers cm ON cm.cohort_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC
       LIMIT 50`,
      CohortSchema,
      undefined,
      { label: "List all cohorts" }
    );

    const active = cohorts.find(c => c.is_active) ?? null;
    return { cohorts, active_cohort: active };
  },
});
