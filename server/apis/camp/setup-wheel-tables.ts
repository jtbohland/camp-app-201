import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupWheelTables",
  description: "Creates wheel_rounds and wheel_scores tables if they don't exist",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_wheel_rounds (
        id SERIAL PRIMARY KEY,
        pitcher_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        product_id TEXT NOT NULL,
        product_name TEXT NOT NULL,
        challenge_type TEXT NOT NULL,
        challenge_prompt TEXT NOT NULL,
        completion_score INTEGER NOT NULL DEFAULT 1,
        pitch_time_seconds INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'scoring',
        self_scores JSONB,
        room_avg_scores JSONB,
        room_vote_count INTEGER DEFAULT 0,
        points_awarded INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        closed_at TIMESTAMPTZ
      )`,
      undefined,
      { label: "Create wheel_rounds table" }
    );

    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_wheel_scores (
        id SERIAL PRIMARY KEY,
        round_id INTEGER NOT NULL REFERENCES camp201_wheel_rounds(id),
        scorer_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        is_self_eval BOOLEAN NOT NULL DEFAULT FALSE,
        clarity INTEGER NOT NULL,
        tone INTEGER NOT NULL,
        credibility INTEGER NOT NULL,
        close_score INTEGER NOT NULL,
        completion INTEGER NOT NULL,
        total INTEGER NOT NULL,
        submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(round_id, scorer_id)
      )`,
      undefined,
      { label: "Create wheel_scores table" }
    );

    return { success: true };
  },
});
