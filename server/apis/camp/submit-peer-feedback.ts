import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SubmitPeerFeedback",
  description: "Submits live peer feedback during a presentation and awards points",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    session_label: z.string(),
    team_id: z.number().nullable(),
    author_id: z.number(),
    category: z.enum(["liked", "went_well", "missed_opportunity", "feedback"]),
    content: z.string(),
    points_to_award: z.number(),
  }),
  output: z.object({ success: z.boolean(), feedback_id: z.number(), points_awarded: z.number() }),
  async run(ctx, input) {
    // Get active cohort
    const CohortSchema = z.object({ id: z.coerce.number() });
    const cohort = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortSchema,
      undefined,
      { label: "Get active cohort" }
    );
    const cohortId = cohort.length > 0 ? cohort[0].id : null;

    const InsertSchema = z.object({ id: z.coerce.number() });
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_peer_feedback (session_label, team_id, author_id, category, content, cohort_id, points_awarded)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      InsertSchema,
      [input.session_label, input.team_id, input.author_id, input.category, input.content, cohortId, input.points_to_award],
      { label: "Insert feedback" }
    );

    // Award points to the author for giving feedback
    if (input.points_to_award > 0) {
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
        [input.points_to_award, input.author_id],
        { label: "Award feedback points to author" }
      );
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
         VALUES ($1, $2, $3, 'system')`,
        [input.author_id, input.points_to_award, `Peer feedback: ${input.session_label}`],
        { label: "Log feedback points" }
      );
    }

    return { success: true, feedback_id: result[0].id, points_awarded: input.points_to_award };
  },
});
