import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const HireDetailSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  email: z.string(),
  points: z.coerce.number(),
  photo_url: z.string().nullable(),
  profile_completed: z.boolean(),
  team_id: z.coerce.number().nullable(),
  team_name: z.string().nullable(),
  team_color: z.string().nullable(),
  team_logo_url: z.string().nullable(),
  flight_departure_date: z.string().nullable(),
  flight_departure_time: z.string().nullable(),
  leave_office_by: z.string().nullable(),
});

const PreworkItemSchema = z.object({
  item_key: z.string(),
  title: z.string(),
  completed: z.boolean(),
});

const AbsenceSchema = z.object({
  id: z.coerce.number(),
  reason: z.string(),
  start_time: z.string().nullable(),
  end_time: z.string().nullable(),
  status: z.string(),
  created_at: z.string(),
});

const CommentSchema = z.object({
  id: z.coerce.number(),
  comment_type: z.string(),
  sentiment: z.string(),
  content: z.string(),
  created_at: z.string(),
  manager_first_name: z.string(),
  manager_last_name: z.string(),
});

const SurveyCompletionSchema = z.object({
  survey_id: z.coerce.number(),
  survey_title: z.string(),
  submitted_at: z.string(),
});

const ExecQuestionSchema = z.object({
  id: z.coerce.number(),
  question_text: z.string(),
  executive_name: z.string(),
  vote_count: z.coerce.number(),
  is_asked: z.boolean(),
  created_at: z.string(),
});

const PresentationScoreSchema = z.object({
  presentation_title: z.string(),
  day_number: z.coerce.number(),
  total_score: z.coerce.number(),
  max_possible: z.coerce.number(),
});

const LeaderboardEntrySchema = z.object({
  camper_id: z.coerce.number(),
  rank: z.coerce.number(),
});

export default api({
  name: "GetManagerDashboard",
  description: "Gets full dashboard data for a manager with all hire analytics",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    manager_email: z.string(),
  }),
  output: z.object({
    manager: z.object({
      id: z.coerce.number(),
      first_name: z.string(),
      last_name: z.string(),
      title: z.string(),
    }).nullable(),
    hires: z.array(z.object({
      camper: HireDetailSchema,
      prework: z.array(PreworkItemSchema),
      absences: z.array(AbsenceSchema),
      comments: z.array(CommentSchema),
      surveys: z.array(SurveyCompletionSchema),
      exec_questions: z.array(ExecQuestionSchema),
      presentation_scores: z.array(PresentationScoreSchema),
      rank: z.number().nullable(),
    })),
    total_campers: z.number(),
    total_surveys: z.number(),
  }),
  async run(ctx, input) {
    // Find manager
    const ManagerSchema = z.object({
      id: z.coerce.number(),
      first_name: z.string(),
      last_name: z.string(),
      title: z.string(),
    });
    const managers = await ctx.integrations.apps_database.query(
      `SELECT id, first_name, last_name, title FROM camp201_managers WHERE email = $1 LIMIT 1`,
      ManagerSchema,
      [input.manager_email],
      { label: "Find manager" }
    );

    if (managers.length === 0) {
      return { manager: null, hires: [], total_campers: 0, total_surveys: 0 };
    }

    const manager = managers[0];

    // Update last_viewed_at
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_managers SET last_viewed_at = NOW() WHERE id = $1`,
      [manager.id],
      { label: "Update manager last viewed" }
    );

    // Get linked hires with team details
    const hires = await ctx.integrations.apps_database.query(
      `SELECT c.id, c.first_name, c.last_name, c.role, c.email, c.points, c.photo_url,
              c.profile_completed, c.team_id, t.name as team_name, t.color as team_color, t.logo_url as team_logo_url,
              c.flight_departure_date::text, c.flight_departure_time, c.leave_office_by
       FROM camp201_manager_hires mh
       JOIN camp201_campers c ON c.id = mh.camper_id
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       WHERE mh.manager_id = $1
       ORDER BY c.last_name, c.first_name
       LIMIT 50`,
      HireDetailSchema,
      [manager.id],
      { label: "Get manager hires with team info" }
    );

    // Get leaderboard ranks
    const ranks = await ctx.integrations.apps_database.query(
      `SELECT id as camper_id, RANK() OVER (ORDER BY points DESC)::integer as rank
       FROM camp201_campers
       WHERE cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1)
         AND role NOT IN ('counselor', 'admin')
       LIMIT 200`,
      LeaderboardEntrySchema,
      undefined,
      { label: "Get leaderboard ranks" }
    );
    const rankMap = new Map(ranks.map(r => [r.camper_id, r.rank]));

    // Get total camper count
    const CountSchema = z.object({ count: z.coerce.number() });
    const totalResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*) as count FROM camp201_campers
       WHERE cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1)
         AND role NOT IN ('counselor', 'admin')`,
      CountSchema,
      undefined,
      { label: "Count total campers" }
    );
    const totalCampers = totalResult[0]?.count ?? 0;

    // Get total surveys count for context
    const surveyCountResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*) as count FROM camp201_surveys
       WHERE cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1)`,
      CountSchema,
      undefined,
      { label: "Count total surveys" }
    );
    const totalSurveys = surveyCountResult[0]?.count ?? 0;

    // Build hire details
    const hireDetails = [];
    for (const hire of hires) {
      // Prework status
      const prework = await ctx.integrations.apps_database.query(
        `SELECT jc.item_key, jc.title,
                CASE WHEN pw.id IS NOT NULL AND pw.completed = true THEN true ELSE false END as completed
         FROM camp201_journey_content jc
         LEFT JOIN camp201_prework pw ON pw.user_id = $1 AND pw.item = jc.item_key
         WHERE jc.is_checkable = true
         ORDER BY jc.sort_order
         LIMIT 20`,
        PreworkItemSchema,
        [hire.id],
        { label: `Prework for ${hire.first_name}` }
      );

      // Absences
      const absences = await ctx.integrations.apps_database.query(
        `SELECT id, reason, start_time::text, end_time::text, status, created_at::text
         FROM camp201_absence_requests
         WHERE camper_id = $1
         ORDER BY created_at DESC
         LIMIT 20`,
        AbsenceSchema,
        [hire.id],
        { label: `Absences for ${hire.first_name}` }
      );

      // Manager comments
      const comments = await ctx.integrations.apps_database.query(
        `SELECT mc.id, mc.comment_type, mc.sentiment, mc.content, mc.created_at::text,
                m.first_name as manager_first_name, m.last_name as manager_last_name
         FROM camp201_manager_comments mc
         JOIN camp201_managers m ON m.id = mc.manager_id
         WHERE mc.camper_id = $1
         ORDER BY mc.created_at DESC
         LIMIT 50`,
        CommentSchema,
        [hire.id],
        { label: `Comments for ${hire.first_name}` }
      );

      // Survey completions
      const surveys = await ctx.integrations.apps_database.query(
        `SELECT sr.survey_id, s.title as survey_title, sr.submitted_at::text
         FROM camp201_survey_responses sr
         JOIN camp201_surveys s ON s.id = sr.survey_id
         WHERE sr.camper_id = $1
         ORDER BY sr.submitted_at DESC
         LIMIT 20`,
        SurveyCompletionSchema,
        [hire.id],
        { label: `Surveys for ${hire.first_name}` }
      );

      // Executive Q&A submissions
      const execQuestions = await ctx.integrations.apps_database.query(
        `SELECT eq.id, eq.question_text, e.name as executive_name, eq.vote_count, eq.is_asked, eq.created_at::text
         FROM camp201_exec_questions eq
         JOIN camp201_executives e ON e.id = eq.executive_id
         WHERE eq.submitted_by = $1
         ORDER BY eq.created_at DESC
         LIMIT 20`,
        ExecQuestionSchema,
        [hire.id],
        { label: `Exec Q&A for ${hire.first_name}` }
      );

      // Team presentation scores (via team_id)
      let presentationScores: z.infer<typeof PresentationScoreSchema>[] = [];
      if (hire.team_id) {
        presentationScores = await ctx.integrations.apps_database.query(
          `SELECT p.title as presentation_title, p.day_number,
                  COALESCE(SUM(ps.score), 0)::integer as total_score,
                  COALESCE(SUM(ps.max_points), 0)::integer as max_possible
           FROM camp201_presentations p
           LEFT JOIN camp201_presentation_scores ps ON ps.presentation_id = p.id
           WHERE p.team_id = $1
           GROUP BY p.id, p.title, p.day_number, p.sort_order
           ORDER BY p.day_number, p.sort_order
           LIMIT 20`,
          PresentationScoreSchema,
          [hire.team_id],
          { label: `Presentation scores for team ${hire.team_name}` }
        );
      }

      hireDetails.push({
        camper: hire,
        prework,
        absences,
        comments,
        surveys,
        exec_questions: execQuestions,
        presentation_scores: presentationScores,
        rank: rankMap.get(hire.id) ?? null,
      });
    }

    return { manager, hires: hireDetails, total_campers: totalCampers, total_surveys: totalSurveys };
  },
});
