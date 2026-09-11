import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "AddMemory",
  description: "Adds a text memory or photo to the memories feed, awards KINDling badge on first photo",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    camper_id: z.number(),
    memory_type: z.enum(["text", "photo"]),
    content: z.string().nullable(),
    image_url: z.string().nullable(),
    day_number: z.number().nullable(),
  }),
  output: z.object({
    success: z.boolean(),
    memory_id: z.number(),
    badge_awarded: z.boolean(),
  }),
  async run(ctx, input) {
    // Get active cohort
    const cohort = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      undefined,
      { label: "Get active cohort" }
    );
    const cohortId = cohort.length > 0 ? cohort[0].id : null;

    // Validate input
    if (input.memory_type === "text" && (!input.content || input.content.trim().length < 5)) {
      throw new Error("Memory text must be at least 5 characters");
    }
    if (input.memory_type === "photo" && !input.image_url) {
      throw new Error("Photo URL is required for photo memories");
    }

    // Insert memory
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_memories (camper_id, memory_type, content, image_url, day_number, cohort_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [input.camper_id, input.memory_type, input.content?.trim() ?? null, input.image_url, input.day_number, cohortId],
      { label: "Insert memory" }
    );

    // Award KINDling badge on first photo upload
    let badgeAwarded = false;
    if (input.memory_type === "photo") {
      // Find KINDling badge ID
      const badge = await ctx.integrations.apps_database.query(
        `SELECT id FROM camp201_badges WHERE name = 'KINDling' LIMIT 1`,
        z.object({ id: z.coerce.number() }),
        undefined,
        { label: "Find KINDling badge" }
      );

      if (badge.length > 0) {
        const kindlingId = badge[0].id;

        // Check if already awarded
        const existing = await ctx.integrations.apps_database.query(
          `SELECT id FROM camp201_camper_badges WHERE camper_id = $1 AND badge_id = $2 LIMIT 1`,
          z.object({ id: z.coerce.number() }),
          [input.camper_id, kindlingId],
          { label: "Check existing KINDling badge" }
        );

        if (existing.length === 0) {
          await ctx.integrations.apps_database.execute(
            `INSERT INTO camp201_camper_badges (camper_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [input.camper_id, kindlingId],
            { label: "Award KINDling badge" }
          );

          // Award badge points (5 pts)
          const badgePoints = await ctx.integrations.apps_database.query(
            `SELECT points_reward FROM camp201_badges WHERE id = $1 LIMIT 1`,
            z.object({ points_reward: z.coerce.number() }),
            [kindlingId],
            { label: "Get KINDling points" }
          );
          const pts = badgePoints[0]?.points_reward ?? 0;
          if (pts > 0) {
            await ctx.integrations.apps_database.execute(
              `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
              [pts, input.camper_id],
              { label: "Award KINDling points" }
            );
            await ctx.integrations.apps_database.execute(
              `INSERT INTO camp201_points_log (camper_id, points, reason) VALUES ($1, $2, $3)`,
              [input.camper_id, pts, "KINDling badge — first photo shared to Memories"],
              { label: "Log KINDling points" }
            );
          }
          badgeAwarded = true;
        }
      }
    }

    return { success: true, memory_id: result[0].id, badge_awarded: badgeAwarded };
  },
});
