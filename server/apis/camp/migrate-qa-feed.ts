import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateQAFeed",
  description: "Creates exec_questions and exec_votes tables for Q&A feed.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    await ctx.integrations.camp_db.execute(
      `CREATE TABLE IF NOT EXISTS camp201_exec_questions (
        id SERIAL PRIMARY KEY,
        executive_id INTEGER NOT NULL REFERENCES camp201_executives(id),
        submitted_by INTEGER NOT NULL REFERENCES camp201_campers(id),
        question_text TEXT NOT NULL,
        vote_count INTEGER DEFAULT 0,
        is_asked BOOLEAN DEFAULT FALSE,
        is_locked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create exec_questions table" }
    );

    await ctx.integrations.camp_db.execute(
      `CREATE TABLE IF NOT EXISTS camp201_exec_votes (
        id SERIAL PRIMARY KEY,
        question_id INTEGER NOT NULL REFERENCES camp201_exec_questions(id),
        voter_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        vote INTEGER DEFAULT 1 CHECK (vote IN (-1, 1)),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(question_id, voter_id)
      )`,
      undefined,
      { label: "Create exec_votes table" }
    );

    return { success: true };
  },
});
