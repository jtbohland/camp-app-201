import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "ToggleFinalSurvey",
  description: "Counselor toggles the final post-close survey (zero-point mode)",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    unlocked: z.boolean(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { unlocked }) {
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_config (key, value, updated_at) VALUES ('final_survey_unlocked', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [unlocked ? "true" : "false"],
      { label: unlocked ? "Unlock final survey" : "Lock final survey" }
    );
    return { success: true };
  },
});
