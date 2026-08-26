import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SubmitRubricScore",
  description: "Submits a rubric score for a team presentation and awards points",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    template_id: z.number(),
    team_id: z.number(),
    scored_by: z.number(),
    scores: z.record(z.string(), z.number()),
    notes: z.string().nullable(),
  }),
  output: z.object({
    success: z.boolean(),
    score_id: z.number(),
    total_score: z.number(),
    max_score: z.number(),
    points_awarded: z.number(),
  }),
  async run(ctx, { template_id, team_id, scored_by, scores, notes }) {
    // Get the template to know max score and points to award
    const TemplateSchema = z.object({
      max_total_points: z.coerce.number(),
      points_to_award: z.coerce.number(),
    });
    const templateResult = await ctx.integrations.apps_database.query(
      `SELECT max_total_points, points_to_award FROM camp201_rubric_templates WHERE id = $1 LIMIT 1`,
      TemplateSchema,
      [template_id],
      { label: "Get template for scoring" }
    );

    if (templateResult.length === 0) {
      return { success: false, score_id: 0, total_score: 0, max_score: 0, points_awarded: 0 };
    }

    const template = templateResult[0];
    const totalScore = Object.values(scores).reduce((sum, s) => sum + s, 0);

    // Calculate points: proportional to score percentage × points_to_award
    const scorePercentage = totalScore / template.max_total_points;
    const pointsAwarded = Math.round(scorePercentage * template.points_to_award);

    // Get active cohort
    const CohortSchema = z.object({ id: z.coerce.number() });
    const cohort = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortSchema,
      undefined,
      { label: "Get active cohort for rubric" }
    );
    const cohortId = cohort.length > 0 ? cohort[0].id : null;

    // Insert the score
    const InsertSchema = z.object({ id: z.coerce.number() });
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_rubric_scores (template_id, team_id, scored_by, scores, total_score, max_score, notes, points_awarded, cohort_id)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
       RETURNING id`,
      InsertSchema,
      [template_id, team_id, scored_by, JSON.stringify(scores), totalScore, template.max_total_points, notes, pointsAwarded, cohortId],
      { label: "Insert rubric score" }
    );

    // Award points to all team members
    const MembersSchema = z.object({ id: z.coerce.number() });
    const members = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_campers WHERE team_id = $1 AND role != 'counselor'`,
      MembersSchema,
      [team_id],
      { label: "Get team members for points" }
    );

    for (const member of members) {
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
        [pointsAwarded, member.id],
        { label: `Award ${pointsAwarded} pts to camper ${member.id}` }
      );
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, cohort_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [member.id, pointsAwarded, `Presentation rubric score: ${totalScore}/${template.max_total_points}`, `counselor:${scored_by}`, cohortId],
        { label: `Log points for camper ${member.id}` }
      );
    }

    return {
      success: true,
      score_id: result[0].id,
      total_score: totalScore,
      max_score: template.max_total_points,
      points_awarded: pointsAwarded,
    };
  },
});
