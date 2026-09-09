import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetPointsBreakdown",
  description: "Gets a camper's points grouped by category",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({ camper_id: z.number() }),
  output: z.object({
    categories: z.array(z.object({ category: z.string(), total: z.coerce.number() })),
  }),
  async run(ctx, { camper_id }) {
    const rows = await ctx.integrations.apps_database.query(
      `SELECT category, SUM(points) AS total
       FROM camp201_points_log
       WHERE camper_id = $1
       GROUP BY category
       ORDER BY total DESC
       LIMIT 20`,
      z.object({ category: z.string(), total: z.coerce.number() }),
      [camper_id],
      { label: "Get points by category" }
    );
    return { categories: rows };
  },
});
