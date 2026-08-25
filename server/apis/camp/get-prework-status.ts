import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const PreworkItemSchema = z.object({
  item: z.string(),
  completed_at: z.string().nullable(),
});

export default api({
  name: "GetPreworkStatus",
  description: "Gets the pre-work completion status for a camper",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    user_id: z.number(),
  }),
  output: z.object({
    completedItems: z.array(PreworkItemSchema),
  }),
  async run(ctx, { user_id }) {
    const completedItems = await ctx.integrations.apps_database.query(
      `SELECT item, completed_at::text FROM camp201_prework WHERE user_id = $1`,
      PreworkItemSchema,
      [user_id],
      { label: "Fetch pre-work completions" }
    );

    return { completedItems };
  },
});
