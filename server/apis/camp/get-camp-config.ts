import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ConfigItemSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export default api({
  name: "GetCampConfig",
  description: "Fetches camp configuration settings like number of days",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    config: z.array(ConfigItemSchema),
  }),
  async run(ctx) {
    const config = await ctx.integrations.apps_database.query(
      `SELECT key, value FROM camp201_config LIMIT 50`,
      ConfigItemSchema,
      undefined,
      { label: "Fetch camp config" }
    );

    return { config };
  },
});
