import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

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
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    active_only: z.boolean(),
  }),
  output: z.object({
    executives: z.array(ExecutiveSchema),
  }),
  async run(ctx, { active_only }) {
    const whereClause = active_only ? "WHERE is_active = true" : "";
    const executives = await ctx.integrations.camp_201_db.query(
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
