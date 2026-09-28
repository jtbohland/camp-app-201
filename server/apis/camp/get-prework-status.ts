import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const PreworkItemSchema = z.object({
  item: z.string(),
  completed_at: z.string().nullable(),
});

export default api({
  name: "GetPreworkStatus",
  description: "Gets the pre-work completion status for a camper",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    user_id: z.number(),
  }),
  output: z.object({
    completedItems: z.array(PreworkItemSchema),
  }),
  async run(ctx, { user_id }) {
    const completedItems = await ctx.integrations.camp_201_db.query(
      `SELECT item, completed_at::text FROM camp201_prework WHERE user_id = $1 AND completed = true`,
      PreworkItemSchema,
      [user_id],
      { label: "Fetch pre-work completions" }
    );

    return { completedItems };
  },
});
