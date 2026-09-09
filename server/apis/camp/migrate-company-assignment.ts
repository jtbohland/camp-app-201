import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateCompanyAssignment",
  description: "Adds assigned_company JSONB to teams and creates team_workspace_responses table",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Add assigned_company to teams (JSONB: {name, emoji, color, slug})
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_teams ADD COLUMN IF NOT EXISTS assigned_company JSONB`,
      undefined,
      { label: "Add assigned_company column" }
    );

    // Team-level collaborative workspace responses (shared by all team members)
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_team_workspace (
        id SERIAL PRIMARY KEY,
        presentation_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        responses JSONB NOT NULL DEFAULT '{}',
        last_edited_by INTEGER,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(presentation_id, team_id)
      )`,
      undefined,
      { label: "Create team_workspace table" }
    );

    return { success: true, message: "Company assignment and team workspace ready" };
  },
});
