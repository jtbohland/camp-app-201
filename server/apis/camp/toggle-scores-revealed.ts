import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "ToggleScoresRevealed",
  description: "Locks or reveals presentation scores (counselor only)",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    presentation_id: z.number(),
    revealed: z.boolean(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { presentation_id, revealed }) {
    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_presentations SET scores_revealed = $1 WHERE id = $2`,
      [revealed, presentation_id],
      { label: revealed ? "Reveal scores" : "Lock scores" }
    );

    // If revealing, award points from rubric scores to teams
    if (revealed) {
      // Get all scores for this presentation that haven't been awarded yet
      const scores = await ctx.integrations.camp_201_db.query(
        `SELECT rs.team_id, rs.total_score, rs.scored_by, rs.id AS score_id
         FROM camp201_rubric_scores rs
         WHERE rs.presentation_id = $1 AND rs.points_awarded = 0`,
        z.object({
          team_id: z.coerce.number(),
          total_score: z.coerce.number(),
          scored_by: z.coerce.number(),
          score_id: z.coerce.number(),
        }),
        [presentation_id],
        { label: "Get unawarded scores" }
      );

      for (const score of scores) {
        // Get team members to award points to each
        const members = await ctx.integrations.camp_201_db.query(
          `SELECT id FROM camp201_campers WHERE team_id = $1`,
          z.object({ id: z.coerce.number() }),
          [score.team_id],
          { label: "Get team members for point award" }
        );

        // Award points to each team member
        for (const member of members) {
          await ctx.integrations.camp_201_db.execute(
            `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
             VALUES ($1, $2, $3, 'system', 'presentation')`,
            [member.id, score.total_score, `EBR score (${score.total_score}pts)`],
            { label: "Award EBR points" }
          );
        }

        // Mark score as awarded
        await ctx.integrations.camp_201_db.execute(
          `UPDATE camp201_rubric_scores SET points_awarded = $1 WHERE id = $2`,
          [score.total_score, score.score_id],
          { label: "Mark score as awarded" }
        );
      }
    }

    return { success: true };
  },
});
