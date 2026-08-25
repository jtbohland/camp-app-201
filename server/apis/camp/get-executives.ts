import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ExecutiveSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  title: z.string(),
  photo_url: z.string().nullable(),
  bio: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  is_active: z.boolean(),
});

export default api({
  name: "GetExecutives",
  description: "Fetches all executives in the speaker bank",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    active_only: z.boolean(),
  }),
  output: z.object({
    executives: z.array(ExecutiveSchema),
  }),
  async run(ctx, { active_only }) {
    const whereClause = active_only ? "WHERE is_active = true" : "";
    const executives = await ctx.integrations.apps_database.query(
      `SELECT id, name, title, photo_url, bio, linkedin_url, is_active
       FROM camp201_executives ${whereClause}
       ORDER BY name
       LIMIT 50`,
      ExecutiveSchema,
      undefined,
      { label: "Fetch executives" }
    );

    return { executives };
  },
});
