import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetActiveCohort",
  description: "Returns the currently active cohort details",
  integrations: {
    apps_database: postgres(APPS_DB),
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

    const result = await ctx.integrations.apps_database.query(
      `SELECT id, name, start_date, end_date, is_active, created_at
       FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortSchema,
      undefined,
      { label: "Get active cohort" }
    );

    return { cohort: result[0] ?? null };
  },
});
