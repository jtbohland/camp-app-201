import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "QuickAwardPoints",
  description: "Counselor quick-awards points to a camper for participation, Q&A, etc.",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    points: z.number().min(1).max(50),
    reason: z.string(),
    awarded_by: z.number(),
    category: z.string().nullable(),
  }),
  output: z.object({ success: z.boolean(), id: z.coerce.number() }),
  async run(ctx, { camper_id, points, reason, awarded_by, category }) {
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [camper_id, points, reason, awarded_by.toString(), category ?? "bonus"],
      { label: "Quick award points" }
    );
    return { success: true, id: result[0].id };
  },
});
