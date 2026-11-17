-- 0046: check-in team race fixes, Overachievers missing team points, wrongly-charged late check-ins,
-- and Annie Cimperman's Day 1 survey points. Every step is safe to run more than once.

-- 1) One finish per team per check-in session. This is what stops a team from being paid twice
--    and lets a late (pop-up) check-in still complete a team.
CREATE TABLE IF NOT EXISTS camp201_checkin_team_finishes (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  place INTEGER,
  finished_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (session_id, team_id)
);

-- 2) Record finishes that were already paid, so no team gets paid again for the same session.
INSERT INTO camp201_checkin_team_finishes (session_id, team_id, place)
SELECT x.sid, x.team_id, MIN(x.place)
FROM (
  SELECT substring(l.reason from '\(session (\d+)\)')::int AS sid,
         l.team_id,
         CASE WHEN l.reason LIKE '%1st%' THEN 1 WHEN l.reason LIKE '%2nd%' THEN 2 WHEN l.reason LIKE '%3rd%' THEN 3 ELSE NULL END AS place
  FROM camp201_team_points_log l
  WHERE l.reason LIKE 'Check-in race:%' AND l.team_id IS NOT NULL
) x
WHERE x.sid IS NOT NULL
GROUP BY x.sid, x.team_id
ON CONFLICT (session_id, team_id) DO NOTHING;

-- 3) Overachievers (active cohort): in the most recent check-in where every member was checked in
--    (or excused) and the team got no race points, award the 1st-team bonus (+5 team points).
WITH team AS (
  SELECT t.id, t.cohort_id
  FROM camp201_teams t
  JOIN camp201_cohorts co ON co.id = t.cohort_id AND co.is_active = true
  WHERE lower(trim(t.name)) = 'overachievers'
  LIMIT 1
),
target AS (
  SELECT s.id AS session_id, team.id AS team_id, team.cohort_id
  FROM camp201_checkin_sessions s
  JOIN team ON s.cohort_id = team.cohort_id
  WHERE s.status IN ('active', 'closed')
    AND EXISTS (
      SELECT 1 FROM camp201_campers c
      WHERE c.team_id = team.id AND c.removed_at IS NULL AND COALESCE(c.role, '') NOT IN ('counselor', 'admin')
    )
    AND NOT EXISTS (
      SELECT 1 FROM camp201_campers c
      WHERE c.team_id = team.id AND c.removed_at IS NULL
        AND COALESCE(c.role, '') NOT IN ('counselor', 'admin')
        AND NOT EXISTS (SELECT 1 FROM camp201_admins adm WHERE lower(adm.email) = lower(c.email))
        AND NOT EXISTS (SELECT 1 FROM camp201_checkin_responses r WHERE r.session_id = s.id AND r.camper_id = c.id)
        AND NOT EXISTS (
          SELECT 1 FROM camp201_absence_requests ar
          WHERE ar.camper_id = c.id AND ar.status = 'approved'
            AND ar.start_time <= COALESCE(s.closed_at, s.timer_ends_at)
            AND ar.end_time >= s.started_at
        )
    )
    AND NOT EXISTS (
      SELECT 1 FROM camp201_team_points_log l
      WHERE l.team_id = team.id AND l.reason LIKE 'Check-in race:%(session ' || s.id || ')'
    )
  ORDER BY s.started_at DESC
  LIMIT 1
),
fin AS (
  INSERT INTO camp201_checkin_team_finishes (session_id, team_id, place)
  SELECT session_id, team_id, 1 FROM target
  ON CONFLICT (session_id, team_id) DO NOTHING
  RETURNING session_id, team_id
),
logged AS (
  INSERT INTO camp201_team_points_log (team_id, points, reason, awarded_by, cohort_id)
  SELECT fin.team_id, 5, 'Check-in race: 1st team (session ' || fin.session_id || ')', 'system:0046-checkin-fix', target.cohort_id
  FROM fin JOIN target ON target.team_id = fin.team_id
  RETURNING team_id
)
UPDATE camp201_teams t SET team_points = COALESCE(t.team_points, 0) + 5
WHERE t.id IN (SELECT team_id FROM logged);

-- 4) Undo late check-in penalties that shouldn't have happened:
--    a) pop-up check-ins that were actually inside the 1-minute grace period (device clock was ahead)
--    b) Overachievers members in the check-in fixed in step 3
INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category, reverses_id)
SELECT pl.camper_id, -pl.points, 'Removed: late check-in penalty (check-in error)', 'system', 'reversal', pl.id
FROM camp201_checkin_responses r
JOIN camp201_checkin_sessions s ON s.id = r.session_id
JOIN camp201_cohorts co ON co.id = s.cohort_id AND co.is_active = true
JOIN camp201_campers c ON c.id = r.camper_id
JOIN camp201_points_log pl
  ON pl.camper_id = r.camper_id AND pl.reason = 'Check-in: late (session ' || r.session_id || ')'
 AND pl.points < 0 AND pl.reverses_id IS NULL
WHERE r.timing = 'late'
  AND (
    (r.word_used = 'LATE' AND r.checked_in_at <= s.timer_ends_at + interval '60 seconds')
    OR EXISTS (
      SELECT 1 FROM camp201_team_points_log l
      WHERE l.awarded_by = 'system:0046-checkin-fix' AND l.team_id = c.team_id
        AND l.reason = 'Check-in race: 1st team (session ' || r.session_id || ')'
    )
  )
  AND NOT EXISTS (SELECT 1 FROM camp201_points_log x WHERE x.reverses_id = pl.id)
ON CONFLICT (reverses_id) WHERE reverses_id IS NOT NULL DO NOTHING;

-- 5) Those check-ins count as on time (+3) instead, and stop showing as late.
WITH fixed AS (
  UPDATE camp201_checkin_responses r
  SET timing = 'on_time', points_awarded = 3
  FROM camp201_checkin_sessions s, camp201_cohorts co, camp201_campers c
  WHERE s.id = r.session_id AND co.id = s.cohort_id AND co.is_active = true AND c.id = r.camper_id
    AND r.timing = 'late'
    AND (
      (r.word_used = 'LATE' AND r.checked_in_at <= s.timer_ends_at + interval '60 seconds')
      OR EXISTS (
        SELECT 1 FROM camp201_team_points_log l
        WHERE l.awarded_by = 'system:0046-checkin-fix' AND l.team_id = c.team_id
          AND l.reason = 'Check-in race: 1st team (session ' || r.session_id || ')'
      )
    )
  RETURNING r.camper_id, r.session_id
)
INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
SELECT camper_id, 3, 'Check-in: on_time (session ' || session_id || ') - corrected', 'system'
FROM fixed;

-- 6) Annie Cimperman: on-time Day 1 survey points (+2). No team points. If she submits the survey
--    later, her answers are saved without paying her twice or charging a late penalty.
INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, cohort_id)
SELECT c.id, 2, 'Day 1 survey completed (on time)', 'system', c.cohort_id
FROM camp201_campers c
JOIN camp201_cohorts co ON co.id = c.cohort_id AND co.is_active = true
WHERE lower(trim(c.first_name)) = 'annie' AND lower(trim(c.last_name)) = 'cimperman'
  AND NOT EXISTS (
    SELECT 1 FROM camp201_points_log pl
    WHERE pl.camper_id = c.id AND pl.reason = 'Day 1 survey completed (on time)'
  );
