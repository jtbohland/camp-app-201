import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, isCounselorSql, resolveViewCohort } from "../../lib/cohort.js";
import { getStandings } from "../../lib/cohort-snapshot.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const StatSchema = z.object({ count: z.coerce.number() });

export default api({
  name: "GetHubDashboard",
  description: "Fetches real-time dashboard stats for the Counselor Hub",
  integrations: {
    camp_201_db: postgres(APPS_DB),
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
    // Active cohort, or the counselor's chosen past cohort.
    const db = ctx.integrations.camp_201_db;
    const view = await resolveViewCohort(db, ctx.user.email);
    const VIEW = cohortIdSql(view.cohortId);
    // A cAMPer is anyone in the cohort who isn't a counselor. `role` holds the job title
    // (e.g. "AE – Enterprise"), so never filter on role = 'camper'.
    const IS_CAMPER = `NOT ${isCounselorSql("c")}`;

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
      preworkPct,
      gatesUnlocked,
      gatesTotal,
    ] = await Promise.all([
      safeStat(`SELECT COUNT(*)::int AS count FROM camp201_campers c WHERE c.cohort_id = ${VIEW} AND ${IS_CAMPER}`, "Registered campers"),
      safeStat(`SELECT COUNT(*)::int AS count FROM camp201_campers c JOIN camp201_cohorts co ON co.id = c.cohort_id WHERE co.id = ${VIEW}`, "Total people"),
      safeStat(`SELECT COUNT(*)::int AS count FROM camp201_managers m WHERE m.cohort_id = ${VIEW}`, "Managers"),
      safeStat(`SELECT COUNT(*)::int AS count FROM camp201_teams t JOIN camp201_cohorts co ON co.id = t.cohort_id WHERE co.id = ${VIEW}`, "Teams"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_presentations WHERE day_number > 0 AND is_locked = false", "Unlocked activities"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_presentations WHERE day_number > 0", "Total activities"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_daily_survey_submissions WHERE submitted_at >= CURRENT_DATE", "Surveys today"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_checkin_responses WHERE checked_in_at >= CURRENT_DATE", "Checkins today"),
      // Completed pre-work items ÷ (cAMPers × pre-work items)
      safeStat(`WITH people AS (
          SELECT c.id FROM camp201_campers c WHERE c.cohort_id = ${VIEW} AND ${IS_CAMPER}
        ), items AS (
          SELECT DISTINCT item_key FROM camp201_journey_content
          WHERE section = 'prework' AND is_checkable = true AND item_key IS NOT NULL
        )
        SELECT COALESCE(ROUND(100.0 *
          (SELECT COUNT(*) FROM camp201_prework pw
             JOIN people p ON p.id = pw.user_id
             JOIN items i ON i.item_key = pw.item
            WHERE pw.completed = true)
          / NULLIF((SELECT COUNT(*) FROM people) * (SELECT COUNT(*) FROM items), 0)), 0)::int AS count`, "Prework %"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_feature_gates WHERE is_locked = false", "Gates open"),
      safeStat("SELECT COUNT(*)::int AS count FROM camp201_feature_gates", "Total gates"),
    ]);

    // XP Leader, Leading Team, Average XP — same numbers as the leaderboards
    // (live for the active cohort, saved snapshot for a past one).
    let topCamper: { name: string; xp: number } | null = null;
    let topTeam: { name: string; points: number } | null = null;
    let avgXp = 0;
    try {
      const { campers, teams } = await getStandings(db, view);
      if (campers.length > 0) {
        const c = campers[0];
        topCamper = { name: `${c.first_name} ${c.last_name}`.trim(), xp: c.points };
        avgXp = Math.round(campers.reduce((s, p) => s + p.points, 0) / campers.length);
      }
      if (teams.length > 0) topTeam = { name: teams[0].name, points: teams[0].total_points };
    } catch { /* ignore — don't break the dashboard */ }

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
