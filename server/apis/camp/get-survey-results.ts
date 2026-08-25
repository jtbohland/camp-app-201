import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetSurveyResults",
  description: "Gets survey results and completion tracking for admin view",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    survey_id: z.number().nullable(),
  }),
  output: z.object({
    surveys: z.array(z.object({
      id: z.coerce.number(),
      title: z.string(),
      day_number: z.coerce.number(),
      is_active: z.boolean(),
      response_count: z.coerce.number(),
      total_campers: z.coerce.number(),
      created_at: z.string(),
    })),
    responses: z.array(z.object({
      camper_name: z.string(),
      team_name: z.string().nullable(),
      answers: z.any(),
      submitted_at: z.string(),
    })),
  }),
  async run(ctx, { survey_id }) {
    // Get all surveys for the active cohort
    const SurveyListSchema = z.object({
      id: z.coerce.number(),
      title: z.string(),
      day_number: z.coerce.number(),
      is_active: z.boolean(),
      response_count: z.coerce.number(),
      total_campers: z.coerce.number(),
      created_at: z.string(),
    });

    const surveys = await ctx.integrations.apps_database.query(
      `SELECT s.id, s.title, s.day_number, s.is_active, s.created_at,
              (SELECT COUNT(*) FROM camp201_survey_responses WHERE survey_id = s.id)::int as response_count,
              (SELECT COUNT(*) FROM camp201_campers c WHERE c.cohort_id = s.cohort_id AND c.role != 'counselor')::int as total_campers
       FROM camp201_surveys s
       JOIN camp201_cohorts co ON co.id = s.cohort_id AND co.is_active = true
       ORDER BY s.day_number DESC LIMIT 20`,
      SurveyListSchema,
      undefined,
      { label: "Get surveys list" }
    );

    // Get responses for specific survey
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let responses: any[] = [];
    const targetId = survey_id ?? (surveys.length > 0 ? surveys[0].id : null);

    if (targetId) {
      const ResponseSchema = z.object({
        camper_name: z.string(),
        team_name: z.string().nullable(),
        answers: z.any(),
        submitted_at: z.string(),
      });

      responses = await ctx.integrations.apps_database.query(
        `SELECT CONCAT(c.first_name, ' ', c.last_name) as camper_name,
                t.name as team_name, sr.answers, sr.submitted_at
         FROM camp201_survey_responses sr
         JOIN camp201_campers c ON c.id = sr.camper_id
         LEFT JOIN camp201_teams t ON t.id = c.team_id
         WHERE sr.survey_id = $1
         ORDER BY sr.submitted_at DESC LIMIT 50`,
        ResponseSchema,
        [targetId],
        { label: "Get survey responses" }
      );
    }

    return { surveys, responses };
  },
});
