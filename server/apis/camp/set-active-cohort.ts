import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "SetActiveCohort",
  description: "Sets a specific cohort as the active one, deactivating others",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    cohort_id: z.number(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { cohort_id }) {
    // Deactivate all
    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_cohorts SET is_active = false WHERE is_active = true`,
      undefined,
      { label: "Deactivate all cohorts" }
    );

    // Activate target
    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_cohorts SET is_active = true, updated_at = NOW() WHERE id = $1`,
      [cohort_id],
      { label: "Activate selected cohort" }
    );

    return { success: true };
  },
});
