import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateGoalColumns",
  description: "Adds goal_achieved columns to camp201_campers for check-off feature",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_campers
       ADD COLUMN IF NOT EXISTS goal_1_achieved BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS goal_2_achieved BOOLEAN DEFAULT false,
       ADD COLUMN IF NOT EXISTS goal_3_achieved BOOLEAN DEFAULT false`,
      undefined,
      { label: "Add goal achievement columns" }
    );

    return { success: true, message: "Added goal_1_achieved, goal_2_achieved, goal_3_achieved columns" };
  },
});
