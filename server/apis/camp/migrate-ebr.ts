import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateEBR",
  description: "Creates EBR role assignments table and adds scores_revealed column",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // 1. Add scores_revealed column to presentations
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_presentations ADD COLUMN IF NOT EXISTS scores_revealed BOOLEAN DEFAULT false`,
      undefined,
      { label: "Add scores_revealed column" }
    );

    // 2. Add presentation_id to rubric_scores for linking scores to specific presentations
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_rubric_scores ADD COLUMN IF NOT EXISTS presentation_id INTEGER`,
      undefined,
      { label: "Add presentation_id to rubric_scores" }
    );

    // 3. Create counselor role assignments table for EBR
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_ebr_role_assignments (
        id SERIAL PRIMARY KEY,
        presentation_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        counselor_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        company_name TEXT NOT NULL DEFAULT '',
        executive_role TEXT NOT NULL DEFAULT '',
        notes TEXT DEFAULT '',
        assigned_by INTEGER,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(presentation_id, team_id, counselor_id)
      )`,
      undefined,
      { label: "Create EBR role assignments table" }
    );

    // 4. Add session_bank_id to presentations for agenda sync
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_presentations ADD COLUMN IF NOT EXISTS session_bank_id INTEGER`,
      undefined,
      { label: "Add session_bank_id for agenda sync" }
    );

    return { success: true, message: "EBR migration complete: scores_revealed, role_assignments table, session_bank_id" };
  },
});
