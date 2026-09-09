import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateHackathon",
  description: "Creates hackathon submissions and votes tables",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_hackathon_submissions (
        id SERIAL PRIMARY KEY,
        presentation_id INTEGER NOT NULL,
        team_id INTEGER NOT NULL UNIQUE,
        app_name TEXT NOT NULL DEFAULT '',
        description TEXT NOT NULL DEFAULT '',
        use_case TEXT NOT NULL DEFAULT '',
        how_it_works TEXT NOT NULL DEFAULT '',
        who_uses_it TEXT NOT NULL DEFAULT '',
        app_link TEXT DEFAULT '',
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create hackathon submissions table" }
    );

    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_hackathon_votes (
        id SERIAL PRIMARY KEY,
        presentation_id INTEGER NOT NULL,
        voter_camper_id INTEGER NOT NULL,
        voted_for_team_id INTEGER NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(presentation_id, voter_camper_id)
      )`,
      undefined,
      { label: "Create hackathon votes table" }
    );

    return { success: true, message: "Hackathon tables created" };
  },
});
