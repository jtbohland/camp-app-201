import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "MigrateTeamsTable",
  description: "Adds missing columns to camp201_teams table",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    await ctx.integrations.camp_201_db.execute(
      `ALTER TABLE camp201_teams ADD COLUMN IF NOT EXISTS logo_url TEXT`,
      undefined,
      { label: "Add logo_url column" }
    );
    await ctx.integrations.camp_201_db.execute(
      `ALTER TABLE camp201_teams ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#2d6a4f'`,
      undefined,
      { label: "Add color column" }
    );
    return { success: true };
  },
});
