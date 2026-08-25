import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "CompletePreworkItem",
  description: "Marks a pre-work item as complete for a camper and awards points",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    user_id: z.number(),
    item: z.string(),
    email: z.string(),
  }),
  output: z.object({
    success: z.boolean(),
    pointsAwarded: z.number(),
  }),
  async run(ctx, { user_id, item, email }) {
    // Insert completion (ignore if already done)
    const result = await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_prework (user_id, item, completed)
       VALUES ($1, $2, true)
       ON CONFLICT (user_id, item) DO NOTHING`,
      [user_id, item],
      { label: "Mark pre-work item complete" }
    );

    // Only award points if this is a new completion
    let pointsAwarded = 0;
    if (result.rowCount && result.rowCount > 0) {
      pointsAwarded = 5;
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + 5 WHERE id = $1`,
        [user_id],
        { label: "Award pre-work points" }
      );
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
         VALUES ($1, 5, $2, 'system')`,
        [user_id, `Pre-work completed: ${item}`],
        { label: "Log pre-work points" }
      );
    }

    return { success: true, pointsAwarded };
  },
});
