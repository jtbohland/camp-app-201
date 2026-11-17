import { z } from "@superblocksteam/sdk-api";

/** Team race bonus by finishing place (1st, 2nd, 3rd). 4th+ gets nothing. */
export const TEAM_RACE_BONUSES = [5, 3, 1];

export const ordinal = (n: number) => (n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`);

/** Check-ins a cAMPer actually made (not an excused or counselor back-filled spot). */
export const REAL_TIMINGS_SQL = `('early', 'on_time', 'late')`;

/**
 * Who has to check in for a team: active (not removed) cAMPers who aren't counselors or admins
 * (a cAMPer with no role set still counts). Same rule everywhere (race award, live progress, late
 * pop-up) so they can never disagree. Use with a camp201_campers alias of "c".
 */
export const COUNTS_FOR_CHECKIN_SQL = `c.removed_at IS NULL
    AND COALESCE(c.role, '') NOT IN ('counselor', 'admin')
    AND NOT EXISTS (SELECT 1 FROM camp201_admins adm WHERE lower(adm.email) = lower(c.email))`;

/**
 * Excused for session $1: an approved absence that overlaps the check-in (from when the timer
 * started until the grace minute ends), so they'll miss it. Use with alias "c".
 */
export const EXCUSED_SQL = `EXISTS (
    SELECT 1 FROM camp201_absence_requests ar
    JOIN camp201_checkin_sessions xs ON xs.id = $1
    WHERE ar.camper_id = c.id AND ar.status = 'approved'
      AND ar.start_time <= COALESCE(xs.timer_ends_at, NOW()) + INTERVAL '1 minute'
      AND ar.end_time >= COALESCE(xs.started_at, NOW())
  )`;

const MEMBERS_SQL = `
  SELECT c.id,
         EXISTS (SELECT 1 FROM camp201_checkin_responses r WHERE r.session_id = $1 AND r.camper_id = c.id) AS checked_in,
         ${EXCUSED_SQL} AS excused
  FROM camp201_campers c
  WHERE c.team_id = $2 AND ${COUNTS_FOR_CHECKIN_SQL}`;

/**
 * Records excused members of a team as present for 0 points (timing 'absent'), so they never show
 * as missed and never earn solo points. Safe to repeat.
 */
export async function markExcusedPresent(db: any, sessionId: number, teamId: number): Promise<void> {
  await db.execute(
    `INSERT INTO camp201_checkin_responses (session_id, camper_id, team_id, timing, word_used, points_awarded)
     SELECT $1, m.id, $2, 'absent', 'ABSENT', 0
     FROM (${MEMBERS_SQL}) m
     WHERE m.excused AND NOT m.checked_in
     ON CONFLICT (session_id, camper_id) DO NOTHING`,
    [sessionId, teamId],
    { label: "Mark excused members present (0 pts)" }
  );
}

/**
 * Call after EVERY check-in (on time, late, counselor back-fill) and when a check-in closes. When
 * every member is checked in or excused (and at least one member really checked in), the team
 * places once per session. The finish row is unique per (session, team), so a team can never be
 * paid twice.
 *
 * Place is decided by when the team's last REAL check-in happened, not when the row was written.
 * So when a counselor back-fills a missing member later, the team gets the place it actually
 * earned, and no other team loses theirs.
 */
export async function recordTeamFinishIfComplete(
  db: any,
  sessionId: number,
  teamId: number | null
): Promise<{ teamComplete: boolean; place: number | null }> {
  if (!teamId) return { teamComplete: false, place: null };

  const members = await db.query(
    `${MEMBERS_SQL} LIMIT 50`,
    z.object({ id: z.coerce.number(), checked_in: z.boolean(), excused: z.boolean() }),
    [sessionId, teamId],
    { label: "Team members' check-in status" }
  );
  if (members.length === 0 || !members.every((m: { checked_in: boolean; excused: boolean }) => m.checked_in || m.excused)) {
    return { teamComplete: false, place: null };
  }

  // Claim the finish (only one call per team per session wins this insert). A team where nobody
  // actually checked in (everyone excused or back-filled) can't place.
  const claimed = await db.query(
    `WITH eff AS (
       SELECT MAX(r.checked_in_at) AS at
       FROM camp201_checkin_responses r
       JOIN camp201_campers c ON c.id = r.camper_id
       WHERE r.session_id = $1 AND c.team_id = $2 AND r.timing IN ${REAL_TIMINGS_SQL}
     ),
     ins AS (
       INSERT INTO camp201_checkin_team_finishes (session_id, team_id, finished_at)
       SELECT $1, $2, LEAST(eff.at, NOW()) FROM eff WHERE eff.at IS NOT NULL
       ON CONFLICT (session_id, team_id) DO NOTHING
       RETURNING id
     ) SELECT id FROM ins LIMIT 1`,
    z.object({ id: z.coerce.number() }),
    [sessionId, teamId],
    { label: "Claim team finish" }
  );
  if (claimed.length === 0) {
    // Already placed earlier, or nobody really checked in yet.
    await markExcusedPresent(db, sessionId, teamId);
    return { teamComplete: true, place: null };
  }

  // Place = 1 + teams that finished earlier in this session.
  const placed = await db.query(
    `WITH p AS (
       UPDATE camp201_checkin_team_finishes f
       SET place = 1 + (SELECT COUNT(*) FROM camp201_checkin_team_finishes x
                        WHERE x.session_id = $1 AND x.id <> f.id
                          AND (x.finished_at, x.id) < (f.finished_at, f.id))
       WHERE f.id = $2
       RETURNING f.place
     ) SELECT place FROM p LIMIT 1`,
    z.object({ place: z.coerce.number() }),
    [sessionId, claimed[0].id],
    { label: "Set finishing place" }
  );
  const place = placed[0]?.place ?? 1;

  await db.execute(
    `UPDATE camp201_checkin_sessions
     SET teams_finished = GREATEST(COALESCE(teams_finished, 0), $2),
         first_team_id = CASE WHEN $2 = 1 AND first_team_id IS NULL THEN $3 ELSE first_team_id END
     WHERE id = $1`,
    [sessionId, place, teamId],
    { label: "Update session race progress" }
  );

  const bonus = place <= TEAM_RACE_BONUSES.length ? TEAM_RACE_BONUSES[place - 1] : 0;
  if (bonus > 0) {
    await db.execute(
      `UPDATE camp201_teams SET team_points = team_points + $1 WHERE id = $2`,
      [bonus, teamId],
      { label: `Team race bonus (${ordinal(place)}: +${bonus})` }
    );
    await db.execute(
      `INSERT INTO camp201_team_points_log (team_id, points, reason, cohort_id)
       VALUES ($1, $2, $3, (SELECT cohort_id FROM camp201_teams WHERE id = $1))`,
      [teamId, bonus, `Check-in race: ${ordinal(place)} team (session ${sessionId})`],
      { label: "Log team race bonus" }
    );
  }

  await markExcusedPresent(db, sessionId, teamId);
  return { teamComplete: true, place };
}
