import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupMemories",
  description: "Creates memories and reactions tables + KINDling badge",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Unified memories table (text posts + photo references)
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_memories (
        id SERIAL PRIMARY KEY,
        camper_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        memory_type TEXT NOT NULL DEFAULT 'text',
        content TEXT,
        image_url TEXT,
        day_number INTEGER,
        cohort_id INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create memories table" }
    );

    // Reactions table
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_memory_reactions (
        id SERIAL PRIMARY KEY,
        memory_id INTEGER NOT NULL REFERENCES camp201_memories(id),
        camper_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        emoji TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (memory_id, camper_id, emoji)
      )`,
      undefined,
      { label: "Create reactions table" }
    );

    await ctx.integrations.apps_database.execute(
      `CREATE INDEX IF NOT EXISTS idx_memories_cohort ON camp201_memories(cohort_id, created_at DESC)`,
      undefined,
      { label: "Index memories" }
    );

    await ctx.integrations.apps_database.execute(
      `CREATE INDEX IF NOT EXISTS idx_reactions_memory ON camp201_memory_reactions(memory_id)`,
      undefined,
      { label: "Index reactions" }
    );

    // Insert KINDling merit badge
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_badges (name, description, icon, color, category, points_reward, badge_type, base_points)
       VALUES ('KINDling', 'Shared a photo to Memories — capturing cAMP moments for everyone', 'camera', 'rose', 'engagement', 5, 'merit', 0)
       ON CONFLICT DO NOTHING`,
      undefined,
      { label: "Insert KINDling badge" }
    );

    return { success: true, message: "Memories tables + KINDling badge created" };
  },
});
