import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ResourceSchema = z.object({
  id: z.coerce.number(),
  agenda_item_id: z.coerce.number(),
  title: z.string(),
  url: z.string(),
  resource_type: z.string(),
  description: z.string().nullable(),
  added_by_name: z.string().nullable(),
  created_at: z.string(),
});

export default api({
  name: "GetAgendaResources",
  description: "Gets all resources attached to agenda items",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    agenda_item_id: z.number().nullable(),
  }),
  output: z.object({
    resources: z.array(ResourceSchema),
  }),
  async run(ctx, { agenda_item_id }) {
    const query = agenda_item_id
      ? `SELECT r.id, r.agenda_item_id, r.title, r.url, r.resource_type, r.description, r.created_at,
                CONCAT(c.first_name, ' ', c.last_name) as added_by_name
         FROM camp201_agenda_resources r
         LEFT JOIN camp201_campers c ON c.id = r.added_by
         WHERE r.agenda_item_id = $1
         ORDER BY r.created_at ASC LIMIT 50`
      : `SELECT r.id, r.agenda_item_id, r.title, r.url, r.resource_type, r.description, r.created_at,
                CONCAT(c.first_name, ' ', c.last_name) as added_by_name
         FROM camp201_agenda_resources r
         LEFT JOIN camp201_campers c ON c.id = r.added_by
         ORDER BY r.agenda_item_id, r.created_at ASC LIMIT 200`;

    const params = agenda_item_id ? [agenda_item_id] : undefined;

    const resources = await ctx.integrations.apps_database.query(
      query,
      ResourceSchema,
      params,
      { label: "Get agenda resources" }
    );

    return { resources };
  },
});
