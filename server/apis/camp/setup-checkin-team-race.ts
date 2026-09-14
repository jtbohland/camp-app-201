import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupCheckinTeamRace",
  description: "Add teams_finished column to checkin_sessions for 1st/2nd/3rd tracking",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_checkin_sessions ADD COLUMN IF NOT EXISTS teams_finished INTEGER DEFAULT 0`,
      undefined,
      { label: "Add teams_finished column" }
    );
    return { success: true };
  },
});
