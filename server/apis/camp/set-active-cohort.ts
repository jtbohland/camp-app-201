import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetActiveCohort",
  description: "Sets a specific cohort as the active one, deactivating others",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    cohort_id: z.number(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { cohort_id }) {
    // Deactivate all
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_cohorts SET is_active = false WHERE is_active = true`,
      undefined,
      { label: "Deactivate all cohorts" }
    );

    // Activate target
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_cohorts SET is_active = true, updated_at = NOW() WHERE id = $1`,
      [cohort_id],
      { label: "Activate selected cohort" }
    );

    return { success: true };
  },
});
