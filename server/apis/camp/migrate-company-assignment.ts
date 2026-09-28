import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "MigrateCompanyAssignment",
  description: "Adds assigned_company JSONB to teams and creates team_workspace_responses table",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Add assigned_company to teams (JSONB: {name, emoji, color, slug})
    await ctx.integrations.camp_201_db.execute(
      `ALTER TABLE camp201_teams ADD COLUMN IF NOT EXISTS assigned_company JSONB`,
      undefined,
      { label: "Add assigned_company column" }
    );

    // Team-level collaborative workspace responses (shared by all team members)
    await ctx.integrations.camp_201_db.execute(
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
