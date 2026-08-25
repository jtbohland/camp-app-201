import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateCampConfig",
  description: "Updates a camp configuration value (upsert)",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    key: z.string(),
    value: z.string(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { key, value }) {
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_config (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value],
      { label: "Upsert camp config" }
    );

    return { success: true };
  },
});
