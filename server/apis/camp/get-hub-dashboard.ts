import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const StatSchema = z.object({ count: z.coerce.number() });
const CamperSchema = z.object({ name: z.string(), xp: z.coerce.number() });
const TeamSchema = z.object({ name: z.string(), points: z.coerce.number() });

export default api({
  name: "GetHubDashboard",
  description: "Fetches real-time dashboard stats for the Counselor Hub",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    registered_campers: z.number(),
    total_campers: z.number(),
    registered_managers: z.number(),
    teams_created: z.number(),
    presentations_unlocked: z.number(),
    presentations_total: z.number(),
    surveys_submitted_today: z.number(),
    checkins_today: z.number(),
    avg_xp: z.number(),
    top_camper: z.object({ name: z.string(), xp: z.number() }).nullable(),
    top_team: z.object({ name: z.string(), points: z.number() }).nullable(),
    prework_completion_pct: z.number(),
    gates_unlocked: z.number(),
    gates_total: z.number(),
  }),
  async run(ctx) {
    const db = ctx.integrations.apps_database;

    // Safe query helper — returns default on failure so one bad stat doesn't kill the dashboard
    async function safeStat(sql: string, label: string): Promise<number> {
      try {
        const rows = await db.query(sql, StatSchema, undefined, { label });
        return rows[0]?.count ?? 0;
      } catch { return 0; }
    }

    const [
      registeredCampers,
      totalCampers,
      registeredManagers,
      teamsCreated,
      presUnlocked,
      presTotal,
      surveysToday,
      checkinsToday,
      avgXp,
      preworkPct,
      gatesUnlocked,
      gatesTotal,
    ] = await Promise.all([
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_campers c JOIN camp201_cohorts co ON co.id = c.cohort_id WHERE co.is_active = true AND c.role = 'camper'", "Registered campers"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_campers c JOIN camp201_cohorts co ON co.id = c.cohort_id WHERE co.is_active = true", "Total people"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_campers c JOIN camp201_cohorts co ON co.id = c.cohort_id WHERE co.is_active = true AND c.role = 'manager'", "Managers"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_teams t JOIN camp201_cohorts co ON co.id = t.cohort_id WHERE co.is_active = true", "Teams"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_presentations WHERE day_number > 0 AND is_locked = false", "Unlocked activities"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_presentations WHERE day_number > 0", "Total activities"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_daily_survey_submissions WHERE submitted_at >= CURRENT_DATE", "Surveys today"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_checkin_responses WHERE checked_in_at >= CURRENT_DATE", "Checkins today"),
      safeStat(`SELECT COALESCE(AVG(total)::int, 0) AS count FROM (
        SELECT SUM(pl.points) AS total FROM camp201_points_log pl
        JOIN camp201_campers c ON c.id = pl.camper_id
        JOIN camp201_cohorts co ON co.id = c.cohort_id
        WHERE co.is_active = true AND c.role = 'camper'
        GROUP BY pl.camper_id
      ) sub`, "Avg XP"),
      safeStat(`SELECT COALESCE(ROUND(100.0 * COUNT(*) FILTER (WHERE pw.completed = true) / NULLIF(COUNT(*), 0)), 0)::int AS count
        FROM camp201_prework pw
        JOIN camp201_cohorts co ON co.id = pw.cohort_id
        WHERE co.is_active = true`, "Prework %"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_feature_gates WHERE is_locked = false", "Gates open"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_feature_gates", "Total gates"),
    ]);

    // Top camper + team (separate so they don't block stats)
    let topCamper: { name: string; xp: number } | null = null;
    let topTeam: { name: string; points: number } | null = null;

    try {
      const rows = await db.query(
        `SELECT c.first_name || ' ' || c.last_name AS name, COALESCE(SUM(pl.points), 0)::int AS xp
         FROM camp201_campers c
         JOIN camp201_cohorts co ON co.id = c.cohort_id
         LEFT JOIN camp201_points_log pl ON pl.camper_id = c.id
         WHERE co.is_active = true AND c.role = 'camper'
         GROUP BY c.id, c.first_name, c.last_name
         ORDER BY xp DESC LIMIT 1`,
        CamperSchema, undefined, { label: "Top camper" }
      );
      if (rows.length > 0) topCamper = rows[0];
    } catch { /* ignore */ }

    try {
      const rows = await db.query(
        `SELECT t.name, COALESCE(SUM(pl.points), 0)::int AS points
         FROM camp201_teams t
         JOIN camp201_cohorts co ON co.id = t.cohort_id
         JOIN camp201_team_members tm ON tm.team_id = t.id
         LEFT JOIN camp201_points_log pl ON pl.camper_id = tm.camper_id
         WHERE co.is_active = true
         GROUP BY t.id, t.name
         ORDER BY points DESC LIMIT 1`,
        TeamSchema, undefined, { label: "Top team" }
      );
      if (rows.length > 0) topTeam = rows[0];
    } catch { /* ignore */ }

    return {
      registered_campers: registeredCampers,
      total_campers: totalCampers,
      registered_managers: registeredManagers,
      teams_created: teamsCreated,
      presentations_unlocked: presUnlocked,
      presentations_total: presTotal,
      surveys_submitted_today: surveysToday,
      checkins_today: checkinsToday,
      avg_xp: avgXp,
      top_camper: topCamper,
      top_team: topTeam,
      prework_completion_pct: preworkPct,
      gates_unlocked: gatesUnlocked,
      gates_total: gatesTotal,
    };
  },
});
