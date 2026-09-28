import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetActiveCohort",
  description: "Returns the currently active cohort details",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    cohort: z.object({
      id: z.coerce.number(),
      name: z.string(),
      start_date: z.string().nullable(),
      end_date: z.string().nullable(),
      is_active: z.boolean(),
      created_at: z.string(),
    }).nullable(),
  }),
  async run(ctx) {
    const CohortSchema = z.object({
      id: z.coerce.number(),
      name: z.string(),
      start_date: z.string().nullable(),
      end_date: z.string().nullable(),
      is_active: z.boolean(),
      created_at: z.string(),
    });

    const result = await ctx.integrations.camp_201_db.query(
      `SELECT id, name, start_date, end_date, is_active, created_at
       FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortSchema,
      undefined,
      { label: "Get active cohort" }
    );

    return { cohort: result[0] ?? null };
  },
});
