import { api, z, postgres } from "@superblocksteam/sdk-api";
import { awardRubricImprovementBonus } from "../../lib/rubric-improvement.js";
import { isCampClosed } from "../../lib/camp-closed-guard.js";

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
    if (await isCampClosed(ctx.integrations.apps_database)) {
      return { success: false, score_id: 0, total_score: 0, max_score: 0, points_awarded: 0 };
    }
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

    // Award points to TEAM (not individual members)
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_teams SET team_points = team_points + $1 WHERE id = $2`,
      [pointsAwarded, team_id],
      { label: "Award rubric score to team_points" }
    );
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_team_points_log (team_id, points, reason, cohort_id)
       VALUES ($1, $2, $3, $4)`,
      [team_id, pointsAwarded, `Presentation rubric: ${totalScore}/${template.max_total_points}`, cohortId],
      { label: "Log rubric team points" }
    );

    // Check for improvement bonus
    await awardRubricImprovementBonus(
      ctx.integrations.apps_database, team_id, totalScore, template.max_total_points, cohortId
    );

    // ─── Check if all Mini EBR scores are in → set camp_ready_to_close ───
    const MINI_EBR_TEMPLATE_ID = 100;
    if (template_id === MINI_EBR_TEMPLATE_ID && cohortId) {
      const CountSchema = z.object({ count: z.coerce.number() });
      // Count counselors in cohort
      const counselorResult = await ctx.integrations.apps_database.query(
        `SELECT COUNT(*)::int as count FROM camp201_campers WHERE role = 'counselor' AND cohort_id = $1`,
        CountSchema, [cohortId], { label: "Count counselors for close check" }
      );
      // Count teams (non-test)
      const teamResult = await ctx.integrations.apps_database.query(
        `SELECT COUNT(*)::int as count FROM camp201_teams WHERE cohort_id = $1 AND name != 'TEST'`,
        CountSchema, [cohortId], { label: "Count teams for close check" }
      );
      // Count Mini EBR scores submitted
      const scoreResult = await ctx.integrations.apps_database.query(
        `SELECT COUNT(*)::int as count FROM camp201_rubric_scores WHERE template_id = $1 AND cohort_id = $2`,
        CountSchema, [MINI_EBR_TEMPLATE_ID, cohortId], { label: "Count Mini EBR scores" }
      );
      const needed = counselorResult[0].count * teamResult[0].count;
      if (needed > 0 && scoreResult[0].count >= needed) {
        await ctx.integrations.apps_database.execute(
          `INSERT INTO camp201_config (key, value, updated_at) VALUES ('camp_ready_to_close', 'true', NOW())
           ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW()`,
          undefined, { label: "Set camp_ready_to_close" }
        );
      }
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
