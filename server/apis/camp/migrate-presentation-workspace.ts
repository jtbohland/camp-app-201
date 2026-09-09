import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigratePresentationWorkspace",
  description: "Adds questions JSONB to presentations and creates per-camper response table",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Add structured questions column (array of {section, questions[]})
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_presentations ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'`,
      undefined,
      { label: "Add questions JSONB column" }
    );

    // Per-camper responses table
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_presentation_responses (
        id SERIAL PRIMARY KEY,
        presentation_id INTEGER NOT NULL,
        camper_id INTEGER NOT NULL,
        responses JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(presentation_id, camper_id)
      )`,
      undefined,
      { label: "Create presentation_responses table" }
    );

    return { success: true, message: "Added questions column and responses table" };
  },
});
