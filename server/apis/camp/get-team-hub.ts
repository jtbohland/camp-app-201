import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const HubItemSchema = z.object({
  id: z.coerce.number(),
  team_id: z.coerce.number(),
  author_id: z.coerce.number(),
  author_name: z.string(),
  section: z.string(),
  item_type: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export default api({
  name: "GetTeamHub",
  description: "Fetches all hub items for a specific team",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    team_id: z.number(),
  }),
  output: z.object({
    items: z.array(HubItemSchema),
  }),
  async run(ctx, { team_id }) {
    const items = await ctx.integrations.apps_database.query(
      `SELECT h.id, h.team_id, h.author_id,
              (c.first_name || ' ' || c.last_name) as author_name,
              h.section, h.item_type, h.title, h.content,
              h.created_at::text, h.updated_at::text
       FROM camp201_hub_items h
       JOIN camp201_campers c ON c.id = h.author_id
       WHERE h.team_id = $1
       ORDER BY h.created_at DESC
       LIMIT 200`,
      HubItemSchema,
      [team_id],
      { label: "Fetch team hub items" }
    );

    return { items };
  },
});
