import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateTeamHistory",
  description: "Creates team history archive table for past cohort team names/logos",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_team_history (
        id SERIAL PRIMARY KEY,
        team_name TEXT NOT NULL,
        logo_url TEXT,
        mascot TEXT,
        color_hex TEXT,
        cohort_name TEXT NOT NULL,
        cohort_year INTEGER NOT NULL,
        members_count INTEGER DEFAULT 0,
        final_points INTEGER DEFAULT 0,
        placement INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create team history table" }
    );

    return { success: true, message: "Team history table created." };
  },
});
