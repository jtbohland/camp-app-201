import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ContentSchema = z.object({
  id: z.coerce.number(),
  section: z.string(),
  tab: z.string().nullable(),
  sort_order: z.coerce.number(),
  icon: z.string(),
  title: z.string(),
  content: z.string(),
  tip: z.string().nullable(),
  links: z.any(),
  is_checkable: z.boolean(),
  item_key: z.string().nullable(),
});

export default api({
  name: "GetJourneyContent",
  description: "Fetches journey content by section, with link click status per camper.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    section: z.string(),
    camper_id: z.number().nullable(),
  }),
  output: z.object({
    items: z.array(ContentSchema),
    clicked_links: z.array(z.object({
      content_id: z.coerce.number(),
      link_url: z.string(),
    })),
  }),
  async run(ctx, { section, camper_id }) {
    const items = await ctx.integrations.camp_db.query(
      `SELECT id, section, tab, sort_order, icon, title, content, tip, links, is_checkable, item_key
       FROM camp201_journey_content
       WHERE section = $1
       ORDER BY tab NULLS FIRST, sort_order, id
       LIMIT 100`,
      ContentSchema,
      [section],
      { label: `Get ${section} content` }
    );

    let clicked_links: { content_id: number; link_url: string }[] = [];
    if (camper_id && camper_id > 0) {
      clicked_links = await ctx.integrations.camp_db.query(
        `SELECT content_id, link_url FROM camp201_link_clicks
         WHERE camper_id = $1
         LIMIT 500`,
        z.object({ content_id: z.coerce.number(), link_url: z.string() }),
        [camper_id],
        { label: "Get clicked links" }
      );
    }

    return { items: items as any, clicked_links };
  },
});
