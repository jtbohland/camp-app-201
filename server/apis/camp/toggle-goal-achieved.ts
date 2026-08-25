import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "ToggleGoalAchieved",
  description: "Toggles a camper's goal as achieved or not achieved",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    goal_number: z.number().min(1).max(3),
    achieved: z.boolean(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { camper_id, goal_number, achieved }) {
    const column = `goal_${goal_number}_achieved`;
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_campers SET ${column} = $1, updated_at = NOW() WHERE id = $2`,
      [achieved, camper_id],
      { label: `Toggle goal ${goal_number} achieved` }
    );

    return { success: true };
  },
});
