import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SubmitSurvey",
  description: "Submits a survey response and awards points, including team bonus if all complete",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    survey_id: z.number(),
    camper_id: z.number(),
    answers: z.record(z.string(), z.any()),
  }),
  output: z.object({
    success: z.boolean(),
    points_awarded: z.number(),
    team_bonus_awarded: z.boolean(),
    error: z.string().nullable(),
  }),
  async run(ctx, { survey_id, camper_id, answers }) {
    // Check if already submitted
    const CountSchema = z.object({ count: z.coerce.number() });
    const existing = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_survey_responses WHERE survey_id = $1 AND camper_id = $2`,
      CountSchema,
      [survey_id, camper_id],
      { label: "Check duplicate submission" }
    );
    if (existing[0].count > 0) {
      return { success: false, points_awarded: 0, team_bonus_awarded: false, error: "Already submitted" };
    }

    // Get survey details
    const SurveySchema = z.object({
      points_per_completion: z.coerce.number(),
      team_bonus_points: z.coerce.number(),
      cohort_id: z.coerce.number().nullable(),
    });
    const survey = await ctx.integrations.apps_database.query(
      `SELECT points_per_completion, team_bonus_points, cohort_id FROM camp201_surveys WHERE id = $1 LIMIT 1`,
      SurveySchema,
      [survey_id],
      { label: "Get survey for points" }
    );
    if (survey.length === 0) {
      return { success: false, points_awarded: 0, team_bonus_awarded: false, error: "Survey not found" };
    }

    const { points_per_completion, team_bonus_points, cohort_id } = survey[0];

    // Insert response
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_survey_responses (survey_id, camper_id, answers) VALUES ($1, $2, $3::jsonb)`,
      [survey_id, camper_id, JSON.stringify(answers)],
      { label: "Insert survey response" }
    );

    // Award individual completion points
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
      [points_per_completion, camper_id],
      { label: "Award survey completion points" }
    );
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, cohort_id)
       VALUES ($1, $2, 'End of day survey completed', 'system', $3)`,
      [camper_id, points_per_completion, cohort_id],
      { label: "Log survey points" }
    );

    // Check if whole team has now completed
    let teamBonusAwarded = false;
    const TeamSchema = z.object({ team_id: z.coerce.number().nullable() });
    const camperTeam = await ctx.integrations.apps_database.query(
      `SELECT team_id FROM camp201_campers WHERE id = $1 LIMIT 1`,
      TeamSchema,
      [camper_id],
      { label: "Get camper team for bonus check" }
    );

    if (camperTeam.length > 0 && camperTeam[0].team_id) {
      const teamId = camperTeam[0].team_id;
      const CompSchema = z.object({ total: z.coerce.number(), submitted: z.coerce.number() });
      const comp = await ctx.integrations.apps_database.query(
        `SELECT
          COUNT(c.id)::int as total,
          COUNT(sr.id)::int as submitted
         FROM camp201_campers c
         LEFT JOIN camp201_survey_responses sr ON sr.camper_id = c.id AND sr.survey_id = $1
         WHERE c.team_id = $2 AND c.role != 'counselor'`,
        CompSchema,
        [survey_id, teamId],
        { label: "Check team completion for bonus" }
      );

      if (comp[0].submitted >= comp[0].total && comp[0].total > 0) {
        // Award team bonus to all members
        const MembersSchema = z.object({ id: z.coerce.number() });
        const members = await ctx.integrations.apps_database.query(
          `SELECT id FROM camp201_campers WHERE team_id = $1 AND role != 'counselor'`,
          MembersSchema,
          [teamId],
          { label: "Get team members for bonus" }
        );

        for (const member of members) {
          await ctx.integrations.apps_database.execute(
            `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
            [team_bonus_points, member.id],
            { label: `Award team survey bonus to ${member.id}` }
          );
          await ctx.integrations.apps_database.execute(
            `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, cohort_id)
             VALUES ($1, $2, 'Team survey completion bonus', 'system', $3)`,
            [member.id, team_bonus_points, cohort_id],
            { label: `Log team bonus for ${member.id}` }
          );
        }
        teamBonusAwarded = true;
      }
    }

    return {
      success: true,
      points_awarded: points_per_completion,
      team_bonus_awarded: teamBonusAwarded,
      error: null,
    };
  },
});
