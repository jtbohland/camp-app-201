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
  team_name: z.string().nullable(),
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

const LeaderboardEntrySchema = z.object({
  camper_id: z.coerce.number(),
  rank: z.coerce.number(),
});

export default api({
  name: "GetManagerDashboard",
  description: "Gets full dashboard data for a manager including hire details, prework, absences, comments",
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
      rank: z.number().nullable(),
    })),
    total_campers: z.number(),
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
      return { manager: null, hires: [], total_campers: 0 };
    }

    const manager = managers[0];

    // Update last_viewed_at
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_managers SET last_viewed_at = NOW() WHERE id = $1`,
      [manager.id],
      { label: "Update manager last viewed" }
    );

    // Get linked hires with details
    const hires = await ctx.integrations.apps_database.query(
      `SELECT c.id, c.first_name, c.last_name, c.role, c.email, c.points, c.photo_url,
              c.profile_completed, t.name as team_name,
              c.flight_departure_date::text, c.flight_departure_time, c.leave_office_by
       FROM camp201_manager_hires mh
       JOIN camp201_campers c ON c.id = mh.camper_id
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       WHERE mh.manager_id = $1
       ORDER BY c.last_name, c.first_name
       LIMIT 50`,
      HireDetailSchema,
      [manager.id],
      { label: "Get manager hires" }
    );

    // Get leaderboard ranks for all campers in active cohort
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

    // Get total camper count for percentile context
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

    // Build hire details with prework, absences, and comments
    const hireDetails = [];
    for (const hire of hires) {
      // Get prework status
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

      // Get absences
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

      // Get comments from all managers about this camper
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

      hireDetails.push({
        camper: hire,
        prework,
        absences,
        comments,
        rank: rankMap.get(hire.id) ?? null,
      });
    }

    return { manager, hires: hireDetails, total_campers: totalCampers };
  },
});
