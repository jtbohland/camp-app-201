import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateTeamsTable",
  description: "Adds missing columns to camp201_teams table",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_teams ADD COLUMN IF NOT EXISTS logo_url TEXT`,
      undefined,
      { label: "Add logo_url column" }
    );
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_teams ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#2d6a4f'`,
      undefined,
      { label: "Add color column" }
    );
    return { success: true };
  },
});
