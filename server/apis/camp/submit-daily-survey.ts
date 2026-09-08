import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";
const SURVEY_POINTS = 5;

export default api({
  name: "SubmitDailySurvey",
  description: "Submits a daily survey with session ratings, open responses, and optional overall ratings",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    day_number: z.number(),
    session_ratings: z.array(z.object({
      agenda_item_id: z.number(),
      session_title: z.string(),
      session_type: z.string(),
      rating: z.number().min(1).max(5),
      usefulness: z.number().min(1).max(5),
      comment: z.string().nullable(),
    })),
    open_responses: z.array(z.object({
      key: z.string(),
      response: z.string(),
    })),
    overall_ratings: z.array(z.object({
      aspect_key: z.string(),
      rating: z.number().min(1).max(5),
    })).nullable(),
    overall_open_responses: z.array(z.object({
      key: z.string(),
      response: z.string(),
    })).nullable(),
  }),
  output: z.object({
    success: z.boolean(),
    points_awarded: z.number(),
    on_time: z.boolean(),
  }),
  async run(ctx, input) {
    // Get active cohort
    const CohortSchema = z.object({ id: z.coerce.number() });
    const cohorts = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortSchema,
      undefined,
      { label: "Get active cohort" }
    );
    const cohortId = cohorts.length > 0 ? cohorts[0].id : null;

    // Check for duplicate submission
    const existing = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_daily_survey_submissions
       WHERE camper_id = $1 AND day_number = $2 AND cohort_id = $3 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [input.camper_id, input.day_number, cohortId],
      { label: "Check duplicate submission" }
    );
    if (existing.length > 0) {
      return { success: false, points_awarded: 0, on_time: false };
    }

    // Check if on time (before 9am PT next day)
    const ConfigSchema = z.object({ value: z.string() });
    const startDateRows = await ctx.integrations.apps_database.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_start_date' LIMIT 1`,
      ConfigSchema,
      undefined,
      { label: "Get camp start date" }
    );
    let onTime = true;
    if (startDateRows.length > 0) {
      const startDate = new Date(startDateRows[0].value + "T00:00:00-07:00");
      const deadlineDate = new Date(startDate);
      deadlineDate.setDate(deadlineDate.getDate() + input.day_number);
      deadlineDate.setHours(9, 0, 0, 0);
      onTime = new Date() <= deadlineDate;
    }

    const pointsAwarded = SURVEY_POINTS;

    // Insert submission
    const inserted = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_daily_survey_submissions (camper_id, day_number, cohort_id, points_awarded)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [input.camper_id, input.day_number, cohortId, pointsAwarded],
      { label: "Insert survey submission" }
    );
    const submissionId = inserted[0].id;

    // Insert session ratings
    for (const sr of input.session_ratings) {
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_session_ratings (submission_id, agenda_item_id, session_title, session_type, rating, usefulness, comment)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [submissionId, sr.agenda_item_id, sr.session_title, sr.session_type, sr.rating, sr.usefulness, sr.comment ?? ""],
        { label: `Rate: ${sr.session_title}` }
      );
    }

    // Insert open responses
    for (const or_ of input.open_responses) {
      if (or_.response.trim()) {
        await ctx.integrations.apps_database.execute(
          `INSERT INTO camp201_survey_open_responses (submission_id, question_key, response)
           VALUES ($1, $2, $3)`,
          [submissionId, or_.key, or_.response.trim()],
          { label: `Open: ${or_.key}` }
        );
      }
    }

    // Insert overall ratings (final day)
    if (input.overall_ratings) {
      for (const oRating of input.overall_ratings) {
        await ctx.integrations.apps_database.execute(
          `INSERT INTO camp201_survey_overall_ratings (submission_id, aspect_key, rating)
           VALUES ($1, $2, $3)`,
          [submissionId, oRating.aspect_key, oRating.rating],
          { label: `Overall: ${oRating.aspect_key}` }
        );
      }
    }

    // Insert overall open responses (final day)
    if (input.overall_open_responses) {
      for (const oor of input.overall_open_responses) {
        if (oor.response.trim()) {
          await ctx.integrations.apps_database.execute(
            `INSERT INTO camp201_survey_open_responses (submission_id, question_key, response)
             VALUES ($1, $2, $3)`,
            [submissionId, oor.key, oor.response.trim()],
            { label: `Overall open: ${oor.key}` }
          );
        }
      }
    }

    // Award points
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
      [pointsAwarded, input.camper_id],
      { label: "Award survey points" }
    );
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
       VALUES ($1, $2, $3, 'system')`,
      [input.camper_id, pointsAwarded, `Day ${input.day_number} survey completed${onTime ? " (on time)" : " (late)"}`],
      { label: "Log survey points" }
    );

    return { success: true, points_awarded: pointsAwarded, on_time: onTime };
  },
});
