import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "AddAgendaResource",
  description: "Adds a resource link or material to an agenda item",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    agenda_item_id: z.number(),
    title: z.string(),
    url: z.string(),
    resource_type: z.enum(["link", "slides", "doc", "video", "worksheet"]),
    description: z.string().nullable(),
    added_by: z.number(),
  }),
  output: z.object({ success: z.boolean(), resource_id: z.number() }),
  async run(ctx, input) {
    const InsertSchema = z.object({ id: z.coerce.number() });
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_agenda_resources (agenda_item_id, title, url, resource_type, description, added_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      InsertSchema,
      [input.agenda_item_id, input.title, input.url, input.resource_type, input.description, input.added_by],
      { label: "Add agenda resource" }
    );

    return { success: true, resource_id: result[0].id };
  },
});
