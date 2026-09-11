import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupTeamPoints",
  description: "Adds team_points column and team_points_log table",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Add team_points column if not exists
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_teams ADD COLUMN IF NOT EXISTS team_points INTEGER NOT NULL DEFAULT 0`,
      undefined,
      { label: "Add team_points column" }
    );

    // Create team_points_log table
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_team_points_log (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES camp201_teams(id),
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        awarded_by TEXT,
        cohort_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create team_points_log table" }
    );

    // Create index
    await ctx.integrations.apps_database.execute(
      `CREATE INDEX IF NOT EXISTS idx_team_points_log_team ON camp201_team_points_log(team_id)`,
      undefined,
      { label: "Create team_points_log index" }
    );

    return { success: true, message: "team_points column and team_points_log table created" };
  },
});
