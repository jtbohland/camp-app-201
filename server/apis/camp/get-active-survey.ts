import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetActiveSurvey",
  description: "Gets the currently active survey and completion status for a camper",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number().nullable(),
  }),
  output: z.object({
    survey: z.object({
      id: z.coerce.number(),
      title: z.string(),
      description: z.string().nullable(),
      questions: z.any(),
      day_number: z.coerce.number(),
      points_per_completion: z.coerce.number(),
      team_bonus_points: z.coerce.number(),
    }).nullable(),
    already_submitted: z.boolean(),
    team_completion: z.object({
      submitted: z.number(),
      total: z.number(),
      all_complete: z.boolean(),
    }).nullable(),
  }),
  async run(ctx, { camper_id }) {
    const SurveySchema = z.object({
      id: z.coerce.number(),
      title: z.string(),
      description: z.string().nullable(),
      questions: z.any(),
      day_number: z.coerce.number(),
      points_per_completion: z.coerce.number(),
      team_bonus_points: z.coerce.number(),
    });

    const surveys = await ctx.integrations.apps_database.query(
      `SELECT id, title, description, questions, day_number, points_per_completion, team_bonus_points
       FROM camp201_surveys WHERE is_active = true LIMIT 1`,
      SurveySchema,
      undefined,
      { label: "Get active survey" }
    );

    if (surveys.length === 0) {
      return { survey: null, already_submitted: false, team_completion: null };
    }

    const survey = surveys[0];

    // Check if this camper already submitted
    let alreadySubmitted = false;
    if (camper_id) {
      const CountSchema = z.object({ count: z.coerce.number() });
      const submitted = await ctx.integrations.apps_database.query(
        `SELECT COUNT(*)::int as count FROM camp201_survey_responses WHERE survey_id = $1 AND camper_id = $2`,
        CountSchema,
        [survey.id, camper_id],
        { label: "Check if already submitted" }
      );
      alreadySubmitted = submitted[0].count > 0;
    }

    // Get team completion if camper has a team
    let teamCompletion = null;
    if (camper_id) {
      const TeamSchema = z.object({ team_id: z.coerce.number().nullable() });
      const camperTeam = await ctx.integrations.apps_database.query(
        `SELECT team_id FROM camp201_campers WHERE id = $1 LIMIT 1`,
        TeamSchema,
        [camper_id],
        { label: "Get camper team" }
      );

      if (camperTeam.length > 0 && camperTeam[0].team_id) {
        const teamId = camperTeam[0].team_id;
        const CompletionSchema = z.object({ total: z.coerce.number(), submitted: z.coerce.number() });
        const completion = await ctx.integrations.apps_database.query(
          `SELECT
            COUNT(c.id)::int as total,
            COUNT(sr.id)::int as submitted
           FROM camp201_campers c
           LEFT JOIN camp201_survey_responses sr ON sr.camper_id = c.id AND sr.survey_id = $1
           WHERE c.team_id = $2 AND c.role != 'counselor'`,
          CompletionSchema,
          [survey.id, teamId],
          { label: "Get team survey completion" }
        );
        const { total, submitted } = completion[0];
        teamCompletion = { submitted, total, all_complete: submitted >= total && total > 0 };
      }
    }

    return { survey, already_submitted: alreadySubmitted, team_completion: teamCompletion };
  },
});
