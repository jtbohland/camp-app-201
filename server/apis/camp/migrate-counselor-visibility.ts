import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateCounselorVisibility",
  description: "Adds counselor visibility columns for cohort rotation management",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Add a visible_in_cohort boolean to campers (for counselors)
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS visible_in_cohort BOOLEAN DEFAULT true`,
      undefined,
      { label: "Add visible_in_cohort column" }
    );
    return { success: true, message: "Added visible_in_cohort column" };
  },
});
