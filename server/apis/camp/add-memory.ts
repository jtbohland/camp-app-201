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
    points_awarded: z.number(),
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

    // Check if this is their first of this type
    const CountSchema = z.object({ cnt: z.coerce.number() });
    const countRows = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as cnt FROM camp201_memories WHERE camper_id = $1 AND memory_type = $2`,
      CountSchema,
      [input.camper_id, input.memory_type],
      { label: "Count memories of this type" }
    );
    const countOfType = countRows[0]?.cnt ?? 0;

    let pointsAwarded = 0;

    // +2 points for first photo, +1 point for first text memory
    if (countOfType === 1) {
      const pts = input.memory_type === "photo" ? 2 : 1;
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
        [pts, input.camper_id],
        { label: `Award ${pts} pts for first ${input.memory_type} memory` }
      );
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason) VALUES ($1, $2, $3)`,
        [input.camper_id, pts, `First ${input.memory_type} shared to Memories`],
        { label: "Log memory points" }
      );
      pointsAwarded = pts;
    }

    // KINDling badge: requires BOTH a photo AND a text memory
    let badgeAwarded = false;
    const hasPhotos = await ctx.integrations.apps_database.query(
      `SELECT 1 FROM camp201_memories WHERE camper_id = $1 AND memory_type = 'photo' LIMIT 1`,
      z.object({}),
      [input.camper_id],
      { label: "Check has photos" }
    );
    const hasTexts = await ctx.integrations.apps_database.query(
      `SELECT 1 FROM camp201_memories WHERE camper_id = $1 AND memory_type = 'text' LIMIT 1`,
      z.object({}),
      [input.camper_id],
      { label: "Check has texts" }
    );

    if (hasPhotos.length > 0 && hasTexts.length > 0) {
      const badge = await ctx.integrations.apps_database.query(
        `SELECT id FROM camp201_badges WHERE name = 'KINDling' LIMIT 1`,
        z.object({ id: z.coerce.number() }),
        undefined,
        { label: "Find KINDling badge" }
      );
      if (badge.length > 0) {
        const existing = await ctx.integrations.apps_database.query(
          `SELECT id FROM camp201_camper_badges WHERE camper_id = $1 AND badge_id = $2 LIMIT 1`,
          z.object({ id: z.coerce.number() }),
          [input.camper_id, badge[0].id],
          { label: "Check existing KINDling" }
        );
        if (existing.length === 0) {
          await ctx.integrations.apps_database.execute(
            `INSERT INTO camp201_camper_badges (camper_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [input.camper_id, badge[0].id],
            { label: "Award KINDling badge" }
          );
          badgeAwarded = true;
        }
      }
    }

    return { success: true, memory_id: result[0].id, badge_awarded: badgeAwarded, points_awarded: pointsAwarded };
  },
});
