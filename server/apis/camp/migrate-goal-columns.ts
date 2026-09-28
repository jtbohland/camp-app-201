import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "MigrateGoalColumns",
  description: "Adds goal_achieved columns to camp201_campers for check-off feature",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  async run(ctx) {
    await ctx.integrations.camp_201_db.execute(
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
