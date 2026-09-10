import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigratePreworkSubmissions",
  description: "Creates prework submissions table for Wheel & Deal scores and Challenger screenshots",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_prework_submissions (
        id SERIAL PRIMARY KEY,
        camper_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        item_key TEXT NOT NULL,
        submission_data JSONB NOT NULL DEFAULT '{}',
        flagged BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(camper_id, item_key)
      )`,
      undefined,
      { label: "Create prework submissions table" }
    );
    return { success: true, message: "Prework submissions table created" };
  },
});
