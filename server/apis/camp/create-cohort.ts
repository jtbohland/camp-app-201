import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "CreateCohort",
  description: "Creates a new cohort and optionally sets it as active",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    name: z.string(),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    set_active: z.boolean(),
    created_by: z.number(),
  }),
  output: z.object({ success: z.boolean(), cohort_id: z.number() }),
  async run(ctx, input) {
    // If setting as active, deactivate all others first
    if (input.set_active) {
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_cohorts SET is_active = false WHERE is_active = true`,
        undefined,
        { label: "Deactivate current cohort" }
      );
    }

    const IdSchema = z.object({ id: z.coerce.number() });
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_cohorts (name, start_date, end_date, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      IdSchema,
      [input.name, input.start_date, input.end_date, input.set_active, input.created_by],
      { label: "Create new cohort" }
    );

    return { success: true, cohort_id: result[0].id };
  },
});
