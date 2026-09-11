import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupSpiritVoteTable",
  description: "Creates the camp201_spirit_votes table",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_spirit_votes (
        id SERIAL PRIMARY KEY,
        voter_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        nominee_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        note TEXT,
        cohort_id INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(voter_id, cohort_id)
      )`
    );
    return { success: true };
  },
});
