import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "CreateCohort",
  description: "Creates a new cohort and optionally sets it as active",
  integrations: {
    camp_201_db: postgres(APPS_DB),
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
      await ctx.integrations.camp_201_db.execute(
        `UPDATE camp201_cohorts SET is_active = false WHERE is_active = true`,
        undefined,
        { label: "Deactivate current cohort" }
      );
    }

    const IdSchema = z.object({ id: z.coerce.number() });
    const result = await ctx.integrations.camp_201_db.query(
      `INSERT INTO camp201_cohorts (name, start_date, end_date, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      IdSchema,
      [input.name, input.start_date, input.end_date, input.set_active, input.created_by],
      { label: "Create new cohort" }
    );

    return { success: true, cohort_id: result[0].id };
  },
});
