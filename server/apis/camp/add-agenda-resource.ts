import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "AddAgendaResource",
  description: "Adds a resource link or material to an agenda item",
  integrations: {
    camp_201_db: postgres(APPS_DB),
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
    const result = await ctx.integrations.camp_201_db.query(
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
