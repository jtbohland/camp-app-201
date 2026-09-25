import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "TrackLinkClick",
  description: "Records that a camper clicked a link in journey content.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    content_id: z.number(),
    link_url: z.string(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { camper_id, content_id, link_url }) {
    await ctx.integrations.camp_db.execute(
      `INSERT INTO camp201_link_clicks (camper_id, content_id, link_url)
       VALUES ($1, $2, $3)
       ON CONFLICT (camper_id, content_id, link_url) DO NOTHING`,
      [camper_id, content_id, link_url],
      { label: "Track link click" }
    );
    return { success: true };
  },
});
