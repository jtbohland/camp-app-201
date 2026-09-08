import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetDailySurveyResults",
  description: "Gets survey results for counselor hub, with averages, per-camper data, and open responses",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    day_number: z.number(),
    manager_email: z.string().nullable(), // if set, filter to manager's hires only
  }),
  output: z.object({
    completion: z.object({
      total_campers: z.number(),
      submitted: z.number(),
      completion_pct: z.number(),
    }),
    session_averages: z.array(z.object({
      session_title: z.string(),
      session_type: z.string(),
      avg_rating: z.number(),
      avg_usefulness: z.number(),
      response_count: z.number(),
    })),
    camper_submissions: z.array(z.object({
      camper_id: z.number(),
      camper_name: z.string(),
      submitted_at: z.string(),
      points_awarded: z.number(),
      ratings: z.array(z.object({
        session_title: z.string(),
        rating: z.number(),
        usefulness: z.number(),
        comment: z.string(),
      })),
    })),
    open_responses: z.array(z.object({
      question_key: z.string(),
      camper_name: z.string(),
      response: z.string(),
      submitted_at: z.string(),
    })),
    overall_averages: z.array(z.object({
      aspect_key: z.string(),
      avg_rating: z.number(),
      response_count: z.number(),
    })),
  }),
  async run(ctx, input) {
    const cohortFilter = `(SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1)`;

    // If manager_email is set, get their hire IDs for filtering
    let hireFilter = "";
    if (input.manager_email) {
      const hires = await ctx.integrations.apps_database.query(
        `SELECT mh.camper_id FROM camp201_manager_hires mh
         JOIN camp201_managers m ON m.id = mh.manager_id
         WHERE m.email = $1 LIMIT 50`,
        z.object({ camper_id: z.coerce.number() }),
        [input.manager_email],
        { label: "Get manager hires" }
      );
      if (hires.length === 0) {
        return { completion: { total_campers: 0, submitted: 0, completion_pct: 0 }, session_averages: [], camper_submissions: [], open_responses: [], overall_averages: [] };
      }
      const ids = hires.map(h => h.camper_id).join(",");
      hireFilter = ` AND s.camper_id IN (${ids})`;
    }

    // Completion stats
    const CountSchema = z.object({ count: z.coerce.number() });
    const totalResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*) as count FROM camp201_campers WHERE cohort_id = ${cohortFilter} AND role NOT IN ('counselor','admin')`,
      CountSchema,
      undefined,
      { label: "Count total campers" }
    );
    const totalCampers = input.manager_email ? 0 : (totalResult[0]?.count ?? 0); // managers see their own count

    const submittedResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*) as count FROM camp201_daily_survey_submissions s
       WHERE s.day_number = $1 AND s.cohort_id = ${cohortFilter}${hireFilter}`,
      CountSchema,
      [input.day_number],
      { label: "Count submissions" }
    );
    const submitted = submittedResult[0]?.count ?? 0;

    // Session averages
    const AvgSchema = z.object({
      session_title: z.string(),
      session_type: z.string(),
      avg_rating: z.coerce.number(),
      avg_usefulness: z.coerce.number(),
      response_count: z.coerce.number(),
    });
    const sessionAvgs = await ctx.integrations.apps_database.query(
      `SELECT sr.session_title, sr.session_type,
              ROUND(AVG(sr.rating)::numeric, 2)::float as avg_rating,
              ROUND(AVG(sr.usefulness)::numeric, 2)::float as avg_usefulness,
              COUNT(*)::integer as response_count
       FROM camp201_session_ratings sr
       JOIN camp201_daily_survey_submissions s ON s.id = sr.submission_id
       WHERE s.day_number = $1 AND s.cohort_id = ${cohortFilter}${hireFilter}
       GROUP BY sr.session_title, sr.session_type
       ORDER BY MIN(sr.id)
       LIMIT 30`,
      AvgSchema,
      [input.day_number],
      { label: "Session averages" }
    );

    // Per-camper submissions with ratings
    const SubSchema = z.object({
      id: z.coerce.number(),
      camper_id: z.coerce.number(),
      camper_name: z.string(),
      submitted_at: z.string(),
      points_awarded: z.coerce.number(),
    });
    const subs = await ctx.integrations.apps_database.query(
      `SELECT s.id, s.camper_id,
              (c.first_name || ' ' || c.last_name) as camper_name,
              s.submitted_at::text, s.points_awarded
       FROM camp201_daily_survey_submissions s
       JOIN camp201_campers c ON c.id = s.camper_id
       WHERE s.day_number = $1 AND s.cohort_id = ${cohortFilter}${hireFilter}
       ORDER BY s.submitted_at DESC
       LIMIT 100`,
      SubSchema,
      [input.day_number],
      { label: "Get submissions" }
    );

    const RatingSchema = z.object({
      session_title: z.string(),
      rating: z.coerce.number(),
      usefulness: z.coerce.number(),
      comment: z.string(),
    });

    const camperSubmissions = [];
    for (const sub of subs) {
      const ratings = await ctx.integrations.apps_database.query(
        `SELECT session_title, rating, usefulness, comment
         FROM camp201_session_ratings WHERE submission_id = $1 ORDER BY id LIMIT 30`,
        RatingSchema,
        [sub.id],
        { label: `Ratings for ${sub.camper_name}` }
      );
      camperSubmissions.push({ ...sub, ratings });
    }

    // Open responses
    const OpenSchema = z.object({
      question_key: z.string(),
      camper_name: z.string(),
      response: z.string(),
      submitted_at: z.string(),
    });
    const openResponses = await ctx.integrations.apps_database.query(
      `SELECT o.question_key, (c.first_name || ' ' || c.last_name) as camper_name,
              o.response, s.submitted_at::text
       FROM camp201_survey_open_responses o
       JOIN camp201_daily_survey_submissions s ON s.id = o.submission_id
       JOIN camp201_campers c ON c.id = s.camper_id
       WHERE s.day_number = $1 AND s.cohort_id = ${cohortFilter}${hireFilter}
       ORDER BY o.id DESC
       LIMIT 200`,
      OpenSchema,
      [input.day_number],
      { label: "Get open responses" }
    );

    // Overall averages (final day)
    const OverallAvgSchema = z.object({
      aspect_key: z.string(),
      avg_rating: z.coerce.number(),
      response_count: z.coerce.number(),
    });
    const overallAvgs = await ctx.integrations.apps_database.query(
      `SELECT ov.aspect_key,
              ROUND(AVG(ov.rating)::numeric, 2)::float as avg_rating,
              COUNT(*)::integer as response_count
       FROM camp201_survey_overall_ratings ov
       JOIN camp201_daily_survey_submissions s ON s.id = ov.submission_id
       WHERE s.day_number = $1 AND s.cohort_id = ${cohortFilter}${hireFilter}
       GROUP BY ov.aspect_key
       LIMIT 20`,
      OverallAvgSchema,
      [input.day_number],
      { label: "Overall averages" }
    );

    const effectiveTotal = input.manager_email ? submitted : totalCampers;
    const completionPct = effectiveTotal > 0 ? Math.round((submitted / effectiveTotal) * 100) : 0;

    return {
      completion: { total_campers: effectiveTotal, submitted, completion_pct: completionPct },
      session_averages: sessionAvgs,
      camper_submissions: camperSubmissions,
      open_responses: openResponses,
      overall_averages: overallAvgs,
    };
  },
});
