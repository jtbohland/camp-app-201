import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateJourneyContent",
  description: "Admin updates a journey content item.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
    title: z.string(),
    content: z.string(),
    tip: z.string().nullable(),
    icon: z.string(),
    links: z.string(), // JSON string of [{label, url}]
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    await ctx.integrations.camp_db.execute(
      `UPDATE camp201_journey_content
       SET title = $1, content = $2, tip = $3, icon = $4, links = $5::jsonb, updated_at = NOW()
       WHERE id = $6`,
      [input.title, input.content, input.tip, input.icon, input.links, input.id],
      { label: "Update journey content" }
    );
    return { success: true };
  },
});
