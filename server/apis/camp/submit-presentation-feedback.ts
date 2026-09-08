import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SubmitPresentationFeedback",
  description: "Submit peer feedback for a presentation.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    presentation_id: z.number(),
    submitted_by: z.number(),
    rating: z.number().nullable(),
    strengths: z.string().nullable(),
    improvements: z.string().nullable(),
    comment: z.string().nullable(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    await ctx.integrations.camp_db.execute(
      `INSERT INTO camp201_presentation_feedback (presentation_id, submitted_by, rating, strengths, improvements, comment)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (presentation_id, submitted_by)
       DO UPDATE SET rating = EXCLUDED.rating, strengths = EXCLUDED.strengths,
                     improvements = EXCLUDED.improvements, comment = EXCLUDED.comment`,
      [input.presentation_id, input.submitted_by, input.rating, input.strengths, input.improvements, input.comment],
      { label: "Submit presentation feedback" }
    );

    // Award points for first-time feedback
    const POINTS_PER_FEEDBACK = 2;
    const reason = `Feedback on presentation #${input.presentation_id}`;
    await ctx.integrations.camp_db.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
       SELECT $1, $2, $3, 'presentation_feedback'
       WHERE NOT EXISTS (
         SELECT 1 FROM camp201_points_log
         WHERE camper_id = $1 AND reason = $3
       )`,
      [input.submitted_by, POINTS_PER_FEEDBACK, reason],
      { label: "Award feedback points" }
    );

    // Update total points
    await ctx.integrations.camp_db.execute(
      `UPDATE camp201_campers SET points = (
         SELECT COALESCE(SUM(points), 0) FROM camp201_points_log WHERE camper_id = $1
       ) WHERE id = $1`,
      [input.submitted_by],
      { label: "Sync camper points" }
    );

    return { success: true };
  },
});
