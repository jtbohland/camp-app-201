import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "MigratePresentationWorkspace",
  description: "Adds questions JSONB to presentations and creates per-camper response table",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Add structured questions column (array of {section, questions[]})
    await ctx.integrations.camp_201_db.execute(
      `ALTER TABLE camp201_presentations ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'`,
      undefined,
      { label: "Add questions JSONB column" }
    );

    // Per-camper responses table
    await ctx.integrations.camp_201_db.execute(
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
