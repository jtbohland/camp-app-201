import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "SetupCheckinTeamRace",
  description: "Add teams_finished column to checkin_sessions for 1st/2nd/3rd tracking",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    await ctx.integrations.camp_201_db.execute(
      `ALTER TABLE camp201_checkin_sessions ADD COLUMN IF NOT EXISTS teams_finished INTEGER DEFAULT 0`,
      undefined,
      { label: "Add teams_finished column" }
    );
    return { success: true };
  },
});
