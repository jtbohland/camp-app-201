import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateBingo",
  description: "Creates bingo game tables for Fireside Finder",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Add presentation_type column
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_presentations ADD COLUMN IF NOT EXISTS presentation_type TEXT DEFAULT 'standard'`,
      undefined,
      { label: "Add presentation_type column" }
    );

    // Per-camper bingo state
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_bingo_cards (
        id SERIAL PRIMARY KEY,
        presentation_id INTEGER NOT NULL,
        camper_id INTEGER NOT NULL,
        card JSONB NOT NULL DEFAULT '[]',
        found_squares JSONB NOT NULL DEFAULT '{}',
        last_wrong_guess_camper_id INTEGER,
        score INTEGER NOT NULL DEFAULT 0,
        bingos_claimed JSONB NOT NULL DEFAULT '[]',
        penalty_count INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(presentation_id, camper_id)
      )`,
      undefined,
      { label: "Create bingo_cards table" }
    );

    // Bingo leaderboard events
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_bingo_events (
        id SERIAL PRIMARY KEY,
        presentation_id INTEGER NOT NULL,
        camper_id INTEGER NOT NULL,
        event_type TEXT NOT NULL,
        detail JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create bingo_events table" }
    );

    return { success: true, message: "Bingo tables created" };
  },
});
