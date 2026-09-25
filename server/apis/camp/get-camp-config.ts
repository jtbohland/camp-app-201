import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const ConfigItemSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export default api({
  name: "GetCampConfig",
  description: "Fetches camp configuration settings like number of days",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    config: z.array(ConfigItemSchema),
  }),
  async run(ctx) {
    const config = await ctx.integrations.camp_201_db.query(
      `SELECT key, value FROM camp201_config LIMIT 50`,
      ConfigItemSchema,
      undefined,
      { label: "Fetch camp config" }
    );

    return { config };
  },
});
