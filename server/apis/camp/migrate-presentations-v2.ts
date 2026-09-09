import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigratePresentationsV2",
  description: "Adds lock/unlock, rubric link, and deck columns to presentations",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Add is_locked column (presentations start locked)
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_presentations ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT true`,
      undefined,
      { label: "Add is_locked to presentations" }
    );

    // Add rubric_template_id to link a rubric to each presentation
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_presentations ADD COLUMN IF NOT EXISTS rubric_template_id INTEGER`,
      undefined,
      { label: "Add rubric_template_id" }
    );

    // Add deck template URL (link counselors provide for teams to download)
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_presentations ADD COLUMN IF NOT EXISTS deck_template_url TEXT DEFAULT ''`,
      undefined,
      { label: "Add deck_template_url" }
    );

    // Create team deck submissions table (teams upload their completed deck)
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_team_decks (
        id SERIAL PRIMARY KEY,
        presentation_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        deck_url TEXT NOT NULL DEFAULT '',
        deck_name TEXT NOT NULL DEFAULT '',
        uploaded_by INTEGER,
        uploaded_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(presentation_id, team_id)
      )`,
      undefined,
      { label: "Create team_decks table" }
    );

    return { success: true, message: "Presentations schema enhanced with lock, rubric link, and deck support" };
  },
});
