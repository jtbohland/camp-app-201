import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "ClearPresentationOrder",
  description: "Clear the active presentation order",
  integrations: {
    apps_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx) {
    await ctx.integrations.apps_db.execute(
      `UPDATE camp201_config SET value = '{}' WHERE key = 'active_presentation_order'`,
      [],
      { label: "Clear active presentation order" },
    );
    return { success: true };
  },
});
