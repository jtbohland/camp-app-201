import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "UpdateCampConfig",
  description: "Updates a camp configuration value (upsert)",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    key: z.string(),
    value: z.string(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { key, value }) {
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_config (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value],
      { label: "Upsert camp config" }
    );

    return { success: true };
  },
});
