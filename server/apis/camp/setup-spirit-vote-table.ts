import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "SetupSpiritVoteTable",
  description: "Creates the camp201_spirit_votes table",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    await ctx.integrations.camp_201_db.execute(
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
