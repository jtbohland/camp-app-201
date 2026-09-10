import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "ScoreTeamPresentation",
  description: "Counselor scores a team on a presentation rubric, awarding points to the team",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    rubric_template_id: z.number(),
    team_id: z.number(),
    scorer_camper_id: z.number(),
    scores: z.string(), // JSON: {"criterion_name": score_value, ...}
    notes: z.string().nullable(),
    mvp_camper_id: z.number().nullable().optional(), // Optional MVP award
  }),
  output: z.object({ success: z.boolean(), message: z.string(), total_score: z.number() }),
  async run(ctx, { presentation_id, rubric_template_id, team_id, scorer_camper_id, scores, notes, mvp_camper_id }) {
    const parsedScores = JSON.parse(scores) as Record<string, number>;
    const totalScore = Object.values(parsedScores).reduce((sum, v) => sum + v, 0);

    // Get rubric max
    const rubrics = await ctx.integrations.apps_database.query(
      `SELECT max_total_points FROM camp201_rubric_templates WHERE id = $1 LIMIT 1`,
      z.object({ max_total_points: z.coerce.number() }),
      [rubric_template_id],
      { label: "Get rubric max points" }
    );
    const maxScore = rubrics[0]?.max_total_points ?? 15;

    // Check if already scored
    const existing = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_rubric_scores WHERE template_id = $1 AND team_id = $2 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [rubric_template_id, team_id],
      { label: "Check existing score" }
    );

    if (existing.length > 0) {
      // Update existing score
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_rubric_scores SET scores = $3::jsonb, total_score = $4, max_score = $5, scored_by = $6
         WHERE template_id = $1 AND team_id = $2`,
        [rubric_template_id, team_id, JSON.stringify(parsedScores), totalScore, maxScore, scorer_camper_id],
        { label: "Update rubric score" }
      );
      return { success: true, message: "Score updated", total_score: totalScore };
    }

    // Insert new score
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_rubric_scores (template_id, team_id, scored_by, scores, total_score, max_score, points_awarded, cohort_id)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $5, 2)`,
      [rubric_template_id, team_id, scorer_camper_id, JSON.stringify(parsedScores), totalScore, maxScore],
      { label: "Insert rubric score" }
    );

    // Award points to each team member
    const members = await ctx.integrations.apps_database.query(
      `SELECT tm.user_id AS id FROM camp201_team_members tm
       JOIN camp201_campers c ON c.id = tm.user_id
       WHERE tm.team_id = $1 AND c.role NOT IN ('counselor', 'admin') LIMIT 20`,
      z.object({ id: z.coerce.number() }),
      [team_id],
      { label: "Get team members" }
    );

    for (const m of members) {
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, category, cohort_id)
         VALUES ($1, $2, $3, 'presentation', 2)`,
        [m.id, totalScore, `Value Pillars presentation: team scored ${totalScore}/${maxScore}`],
        { label: `Award points to member ${m.id}` }
      );
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $2 WHERE id = $1`,
        [m.id, totalScore],
        { label: `Update member ${m.id} total` }
      );
    }

    // Award MVP if selected
    if (mvp_camper_id) {
      const MVP_POINTS = 10;
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, category, cohort_id)
         VALUES ($1, $2, 'MVP — Most Valuable Presenter', 'presentation', 2)`,
        [mvp_camper_id, MVP_POINTS],
        { label: "Award MVP points" }
      );
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $2 WHERE id = $1`,
        [mvp_camper_id, MVP_POINTS],
        { label: "Update MVP total" }
      );
    }

    return { success: true, message: `Team scored ${totalScore}/${maxScore}! Points awarded to all ${members.length} members.`, total_score: totalScore };
  },
});
