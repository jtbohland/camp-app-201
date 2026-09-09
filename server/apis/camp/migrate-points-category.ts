import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigratePointsCategory",
  description: "Adds category column to points_log for XP breakdown",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_points_log ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'`,
      undefined,
      { label: "Add category column" }
    );
    return { success: true, message: "Added category column to points_log" };
  },
});
