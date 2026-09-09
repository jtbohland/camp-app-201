import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateLogoVotes",
  description: "Creates team logo voting table and adds logo_voting feature gate",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Create logo votes table
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_team_logo_votes (
        id SERIAL PRIMARY KEY,
        voter_camper_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(voter_camper_id)
      )`,
      undefined,
      { label: "Create logo votes table" }
    );

    // Add logo_voting feature gate if not exists
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_feature_gates (feature_key, label, is_locked)
       VALUES ('logo_voting', 'Logo Voting', true)
       ON CONFLICT (feature_key) DO NOTHING`,
      undefined,
      { label: "Add logo_voting gate" }
    );

    return { success: true, message: "Logo voting table and feature gate created" };
  },
});
