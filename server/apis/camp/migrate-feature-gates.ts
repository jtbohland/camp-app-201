import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const DEFAULT_GATES = [
  { key: "journey", label: "Journey / Pre-work", default_locked: false },
  { key: "agenda", label: "Agenda", default_locked: false },
  { key: "surveys", label: "Surveys", default_locked: true },
  { key: "leaderboard", label: "Leaderboard", default_locked: true },
  { key: "presentations", label: "Presentations", default_locked: true },
  { key: "exec_qa", label: "Executive Q&A", default_locked: true },
  { key: "badges", label: "Badges & XP", default_locked: true },
  { key: "graduation", label: "Graduation", default_locked: true },
  { key: "timer", label: "Timer", default_locked: false },
  { key: "teams", label: "Teams", default_locked: false },
];

export default api({
  name: "MigrateFeatureGates",
  description: "Creates feature gates table and seeds default gate entries",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_feature_gates (
        id SERIAL PRIMARY KEY,
        feature_key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL DEFAULT '',
        is_locked BOOLEAN NOT NULL DEFAULT true,
        unlock_at TIMESTAMPTZ,
        updated_by TEXT DEFAULT 'system',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create feature_gates table" }
    );

    // Seed defaults (skip existing)
    for (const gate of DEFAULT_GATES) {
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_feature_gates (feature_key, label, is_locked)
         VALUES ($1, $2, $3)
         ON CONFLICT (feature_key) DO NOTHING`,
        [gate.key, gate.label, gate.default_locked],
        { label: `Seed gate: ${gate.key}` }
      );
    }

    return { success: true, message: `Feature gates table created with ${DEFAULT_GATES.length} gates` };
  },
});
