import { api, z, postgres } from "@superblocksteam/sdk-api";
import { ACTIVE_COHORT_ID_SQL, assertNotViewingPast, requireCounselor } from "../../lib/cohort.js";
import { COUNTS_FOR_CHECKIN_SQL, EXCUSED_SQL, recordTeamFinishIfComplete } from "../../lib/checkin-team-race.js";
import { syncCheckinPenalties } from "../../lib/checkin-penalties.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const SessionRow = z.object({
  id: z.coerce.number(),
  label: z.string(),
  started_at: z.string(),
  status: z.string(),
});

const PersonRow = z.object({
  camper_id: z.coerce.number(),
  name: z.string(),
  team_id: z.coerce.number().nullable(),
  team_name: z.string().nullable(),
  /** missing = no check-in; late = checked in late. */
  status: z.enum(["missing", "late"]),
  /** What this check-in currently costs them (0 while the check-in is still open). */
  penalty: z.coerce.number(),
});

/**
 * Counselor view for back-filling check-ins: recent check-ins in the active cohort, and for the
 * chosen one, everyone who missed it or was charged late (excused members are already covered).
 */
export const GetCheckInBackfill = api({
  name: "GetCheckInBackfill",
  description: "Counselors: who missed or was late for a check-in, for back-filling",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    /** null = the active check-in, or the most recent one. */
    session_id: z.number().nullable(),
  }),
  output: z.object({
    sessions: z.array(SessionRow),
    session_id: z.number().nullable(),
    people: z.array(PersonRow),
  }),
  async run(ctx, { session_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);

    const sessions = await db.query(
      `SELECT id, label, to_char(started_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS started_at, status
       FROM camp201_checkin_sessions
       WHERE cohort_id = ${ACTIVE_COHORT_ID_SQL}
       ORDER BY (status = 'active') DESC, started_at DESC
       LIMIT 20`,
      SessionRow,
      undefined,
      { label: "Recent check-ins" }
    );
    const chosen = session_id && sessions.some((s) => s.id === session_id) ? session_id : sessions[0]?.id ?? null;
    if (!chosen) return { sessions, session_id: null, people: [] };

    const people = await db.query(
      `SELECT c.id AS camper_id,
              COALESCE(NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''), c.email) AS name,
              c.team_id, t.name AS team_name,
              CASE WHEN r.id IS NULL THEN 'missing' ELSE 'late' END AS status,
              COALESCE((SELECT SUM(pl.points) FROM camp201_points_log pl
                         WHERE pl.camper_id = c.id
                           AND ((pl.category = 'checkin_penalty' AND pl.checkin_session_id = $1)
                                OR pl.reason = 'Check-in: late (session ' || $1::text || ')'
                                OR pl.reverses_id IN (SELECT x.id FROM camp201_points_log x
                                                       WHERE x.camper_id = c.id
                                                         AND x.reason = 'Check-in: late (session ' || $1::text || ')'))), 0) AS penalty
       FROM camp201_campers c
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       LEFT JOIN camp201_checkin_responses r ON r.session_id = $1 AND r.camper_id = c.id
       WHERE c.cohort_id = ${ACTIVE_COHORT_ID_SQL}
         AND ${COUNTS_FOR_CHECKIN_SQL}
         AND (r.id IS NULL OR r.timing = 'late')
         AND NOT (r.id IS NULL AND ${EXCUSED_SQL})
       ORDER BY (r.id IS NULL) DESC, t.name NULLS LAST, name
       LIMIT 200`,
      PersonRow,
      [chosen],
      { label: "Missed / late for this check-in" }
    );

    return { sessions, session_id: chosen, people };
  },
});

/**
 * Counselor back-fills one cAMPer's check-in: no penalty and no solo points. A missed check-in is
 * recorded as back-filled (0 pts); a late check-in has its -2 removed. Then the team race is
 * re-checked, so the team earns the place its real check-ins earned.
 */
export const BackfillCheckIn = api({
  name: "BackfillCheckIn",
  description: "Counselors: back-fill a missed or late check-in with no penalty; re-checks team race",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    session_id: z.number(),
    camper_id: z.number(),
  }),
  output: z.object({
    result: z.enum(["backfilled", "penalty_removed"]),
    points_change: z.number(),
    team_complete: z.boolean(),
    team_place: z.number().nullable(),
  }),
  async run(ctx, { session_id, camper_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    const counselor = (ctx.user.email ?? "").trim().toLowerCase();

    const rows = await db.query(
      `SELECT c.team_id,
              (SELECT r.timing FROM camp201_checkin_responses r WHERE r.session_id = $1 AND r.camper_id = c.id LIMIT 1) AS timing,
              EXISTS (SELECT 1 FROM camp201_checkin_sessions s WHERE s.id = $1 AND s.cohort_id = c.cohort_id) AS same_cohort
       FROM camp201_campers c
       WHERE c.id = $2 AND c.cohort_id = ${ACTIVE_COHORT_ID_SQL} AND ${COUNTS_FOR_CHECKIN_SQL}
       LIMIT 1`,
      z.object({ team_id: z.coerce.number().nullable(), timing: z.string().nullable(), same_cohort: z.boolean() }),
      [session_id, camper_id],
      { label: "Load cAMPer for back-fill" }
    );
    const c = rows[0];
    if (!c) throw new Error("That cAMPer isn't in the active cohort.");
    if (!c.same_cohort) throw new Error("That check-in isn't part of the active cohort.");
    if (c.timing && c.timing !== "late") throw new Error("This cAMPer is already checked in for this session.");

    let result: "backfilled" | "penalty_removed";
    let pointsChange = 0;

    if (!c.timing) {
      // Missed check-in penalties are given back by the penalty sync below.
      // Missed: record them as in, for 0 points (the unique row stops a double tap).
      const ins = await db.query(
        `WITH ins AS (
           INSERT INTO camp201_checkin_responses (session_id, camper_id, team_id, timing, word_used, points_awarded)
           VALUES ($1, $2, $3, 'backfilled', 'COUNSELOR', 0)
           ON CONFLICT (session_id, camper_id) DO NOTHING
           RETURNING id
         ) SELECT id FROM ins LIMIT 1`,
        z.object({ id: z.coerce.number() }),
        [session_id, camper_id, c.team_id],
        { label: "Record back-filled check-in" }
      );
      if (ins.length === 0) throw new Error("This cAMPer was just checked in. Refresh and try again.");
      await db.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
         VALUES ($1, 0, $2, $3)`,
        [camper_id, `Check-in back-filled by counselor, no penalty (session ${session_id})`, counselor],
        { label: "Log back-fill (0 pts)" }
      );
      result = "backfilled";
    } else {
      // Late: remove the -2 (offsetting entry pointing at the original, so it can't be undone twice).
      const reversed = await db.query(
        `WITH pen AS (
           SELECT pl.id, pl.points FROM camp201_points_log pl
           WHERE pl.camper_id = $2 AND pl.reason = 'Check-in: late (session ' || $1::text || ')' AND pl.points < 0
             AND NOT EXISTS (SELECT 1 FROM camp201_points_log r WHERE r.reverses_id = pl.id)
           ORDER BY pl.id LIMIT 1
         ),
         ins AS (
           INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category, reverses_id)
           SELECT $2, -pen.points, 'Removed: late check-in penalty (counselor back-fill, session ' || $1::text || ')', $3, 'reversal', pen.id
           FROM pen
           ON CONFLICT (reverses_id) WHERE reverses_id IS NOT NULL DO NOTHING
           RETURNING points
         )
         SELECT COALESCE((SELECT SUM(points) FROM ins), 0)::int AS pts`,
        z.object({ pts: z.coerce.number() }),
        [session_id, camper_id, counselor],
        { label: "Remove late penalty" }
      );
      pointsChange = reversed[0]?.pts ?? 0;
      await db.execute(
        `UPDATE camp201_checkin_responses SET timing = 'backfilled', points_awarded = 0
         WHERE session_id = $1 AND camper_id = $2 AND timing = 'late'`,
        [session_id, camper_id],
        { label: "Mark check-in back-filled" }
      );
      result = "penalty_removed";
    }

    // A back-fill is no longer a late/missed check-in: give back that penalty and re-price the
    // cAMPer's later ones (e.g. their 4th late drops back to -2).
    pointsChange += await syncCheckinPenalties(db, camper_id);

    const race = await recordTeamFinishIfComplete(db, session_id, c.team_id);
    return { result, points_change: pointsChange, team_complete: race.teamComplete, team_place: race.place };
  },
});
