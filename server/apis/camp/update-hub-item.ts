import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateHubItem",
  description: "Updates an existing hub item's title or content",
  integrations: {
    apps_database: postgres(APPS_DB),
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
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_hub_items SET title = $1, content = $2, updated_at = NOW() WHERE id = $3`,
      [title, content ?? "", id],
      { label: "Update hub item" }
    );

    return { success: true };
  },
});
