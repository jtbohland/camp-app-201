import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "UpdateHubItem",
  description: "Updates an existing hub item's title or content",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
    title: z.string(),
    content: z.string().nullable(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { id, title, content }) {
    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_hub_items SET title = $1, content = $2, updated_at = NOW() WHERE id = $3`,
      [title, content ?? "", id],
      { label: "Update hub item" }
    );

    return { success: true };
  },
});
