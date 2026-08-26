import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateAgendaResources",
  description: "Creates the agenda_resources table for attaching links/materials to agenda items",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_agenda_resources (
        id SERIAL PRIMARY KEY,
        agenda_item_id INTEGER REFERENCES camp201_agenda(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        resource_type TEXT NOT NULL DEFAULT 'link',
        description TEXT,
        added_by INTEGER REFERENCES camp201_campers(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create agenda_resources table" }
    );

    return { success: true, message: "Agenda resources table created." };
  },
});
