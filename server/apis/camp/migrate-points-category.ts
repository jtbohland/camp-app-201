import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "MigratePointsCategory",
  description: "Adds category column to points_log for XP breakdown",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    await ctx.integrations.camp_201_db.execute(
      `ALTER TABLE camp201_points_log ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general'`,
      undefined,
      { label: "Add category column" }
    );
    return { success: true, message: "Added category column to points_log" };
  },
});
