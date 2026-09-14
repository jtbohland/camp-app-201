import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "ToggleSurveyDayLock",
  description: "Lock or unlock a specific survey day for submissions",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    day_number: z.number(),
    locked: z.boolean(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { day_number, locked }) {
    const key = `survey_day_${day_number}_locked`;
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_config (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [key, locked ? "true" : "false"],
      { label: `Toggle survey day ${day_number} lock: ${locked}` }
    );
    return { success: true };
  },
});
