-- 0051: Wheel & Deal spot-on bonus + delta ranking, and tiered late/missed check-in penalties.
-- Every step is safe to run more than once.

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- PART 1: WHEEL & DEAL
-- ═══════════════════════════════════════════════════════════════════════════════════════

-- Spot-on bonus (+3) when the room average rounds to the pitcher's own score.
ALTER TABLE camp201_wheel_rounds ADD COLUMN IF NOT EXISTS spot_on_bonus INTEGER NOT NULL DEFAULT 0;

-- Close a round. Points: +5 for pitching. With room votes: self-awareness +3 / +2 / +1 (self-eval
-- within 1 / within 2 / further from the room average), +2 when the room average is 12 or more,
-- and +3 spot-on when the room average rounds to the self score. Returns NULL if already closed.
CREATE OR REPLACE FUNCTION camp201_close_wheel_round(p_round INTEGER, p_no_self_bonus INTEGER DEFAULT 0)
RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
  rnd RECORD;
  st RECORD;
  self_row RECORD;
  has_self BOOLEAN;
  awareness INTEGER := 0;
  bonus INTEGER := 0;
  spot INTEGER := 0;
  pts INTEGER;
  gap NUMERIC;
BEGIN
  SELECT id, pitcher_id, status INTO rnd FROM camp201_wheel_rounds WHERE id = p_round FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'That Wheel & Deal round no longer exists.';
  END IF;
  IF rnd.status <> 'scoring' THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*)::int AS n,
         ROUND(AVG(clarity)::numeric, 1) AS clarity,
         ROUND(AVG(tone)::numeric, 1) AS tone,
         ROUND(AVG(credibility)::numeric, 1) AS credibility,
         ROUND(AVG(close_score)::numeric, 1) AS close,
         ROUND(AVG(completion)::numeric, 1) AS completion,
         ROUND(AVG(total)::numeric, 1) AS total
    INTO st
    FROM camp201_wheel_scores
   WHERE round_id = p_round AND is_self_eval = FALSE;

  SELECT clarity, tone, credibility, close_score, completion, total
    INTO self_row
    FROM camp201_wheel_scores
   WHERE round_id = p_round AND is_self_eval = TRUE
   LIMIT 1;
  has_self := FOUND;

  IF st.n > 0 THEN
    IF has_self THEN
      gap := abs(self_row.total - st.total);
      awareness := CASE WHEN gap <= 1 THEN 3 WHEN gap <= 2 THEN 2 ELSE 1 END;
      IF ROUND(st.total) = self_row.total THEN
        spot := 3;
      END IF;
    ELSE
      awareness := GREATEST(COALESCE(p_no_self_bonus, 0), 0);
    END IF;
    IF st.total >= 12 THEN
      bonus := 2;
    END IF;
  END IF;
  pts := 5 + awareness + bonus + spot;

  UPDATE camp201_wheel_rounds
     SET status = 'closed',
         self_scores = CASE WHEN has_self THEN jsonb_build_object(
           'clarity', self_row.clarity, 'tone', self_row.tone, 'credibility', self_row.credibility,
           'close', self_row.close_score, 'completion', self_row.completion, 'total', self_row.total) END,
         room_avg_scores = jsonb_build_object(
           'clarity', COALESCE(st.clarity, 0), 'tone', COALESCE(st.tone, 0),
           'credibility', COALESCE(st.credibility, 0), 'close', COALESCE(st.close, 0),
           'completion', COALESCE(st.completion, 0), 'total', COALESCE(st.total, 0)),
         room_vote_count = st.n,
         points_awarded = pts,
         spot_on_bonus = spot,
         closed_at = NOW()
   WHERE id = p_round;

  INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category, wheel_round_id)
  VALUES (rnd.pitcher_id, pts, 'Wheel & Deal pitch (round ' || p_round || ')', 'system', 'wheel', p_round)
  ON CONFLICT (wheel_round_id) WHERE wheel_round_id IS NOT NULL DO NOTHING;

  RETURN pts;
END;
$fn$;

-- Retroactive spot-on bonus for rounds already closed in the active cohort (once per round).
CREATE UNIQUE INDEX IF NOT EXISTS uq_points_log_wheel_spot_on
  ON camp201_points_log (camper_id, reason) WHERE category = 'wheel_spot_on';

WITH bumped AS (
  UPDATE camp201_wheel_rounds w
     SET spot_on_bonus = 3, points_awarded = COALESCE(w.points_awarded, 0) + 3
    FROM camp201_campers c
   WHERE c.id = w.pitcher_id
     AND w.status = 'closed'
     AND w.spot_on_bonus = 0
     AND COALESCE(w.room_vote_count, 0) > 0
     AND w.self_scores ? 'total'
     AND ROUND((w.room_avg_scores->>'total')::numeric) = (w.self_scores->>'total')::numeric
     AND c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
     AND NOT camp201_cohort_frozen(c.cohort_id)
  RETURNING w.id, w.pitcher_id
)
INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
SELECT pitcher_id, 3, 'Wheel & Deal spot-on bonus (round ' || id || ')', 'system', 'wheel_spot_on'
  FROM bumped
ON CONFLICT (camper_id, reason) WHERE category = 'wheel_spot_on' DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════════════════
-- PART 2: LATE / MISSED CHECK-IN PENALTIES
-- A "strike" is a check-in a cAMPer was late for, or missed without an approved absence or a
-- counselor back-fill. Each strike costs its own bracket's rate: 1st–3rd -2, 4th–6th -5, 7th+ -10.
-- A late check-in already charged -2 when it happened; the extra (if any) is logged here.
-- ═══════════════════════════════════════════════════════════════════════════════════════

ALTER TABLE camp201_points_log ADD COLUMN IF NOT EXISTS checkin_session_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_points_log_checkin_penalty
  ON camp201_points_log (camper_id, checkin_session_id) WHERE category = 'checkin_penalty';

CREATE OR REPLACE FUNCTION camp201_checkin_strike_rate(p_n INTEGER) RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE WHEN p_n <= 3 THEN -2 WHEN p_n <= 6 THEN -5 ELSE -10 END;
$fn$;

-- One cAMPer's strikes, oldest first. Only check-ins that are over (closed, or past the grace
-- minute) and that someone actually checked in to (so a test/accidental timer never counts).
CREATE OR REPLACE FUNCTION camp201_checkin_strikes(p_camper INTEGER)
RETURNS TABLE (session_id INTEGER, kind TEXT, strike_no INTEGER, rate INTEGER)
LANGUAGE sql STABLE AS $fn$
  WITH me AS (
    SELECT c.id, c.cohort_id, c.created_at
      FROM camp201_campers c
     WHERE c.id = p_camper
       AND c.removed_at IS NULL
       AND COALESCE(c.role, '') NOT IN ('counselor', 'admin')
       AND NOT camp201_is_admin_email(c.email)
  ),
  sess AS (
    SELECT s.id, s.started_at, s.timer_ends_at
      FROM camp201_checkin_sessions s
      JOIN me ON s.cohort_id = me.cohort_id
     WHERE s.timer_ends_at IS NOT NULL
       AND (s.status = 'closed' OR s.timer_ends_at + INTERVAL '1 minute' < NOW())
       AND (me.created_at IS NULL OR me.created_at <= s.timer_ends_at)
       AND EXISTS (
         SELECT 1 FROM camp201_checkin_responses r
          WHERE r.session_id = s.id AND r.timing IN ('early', 'on_time', 'late', 'backfilled'))
  ),
  hits AS (
    SELECT sess.id AS session_id, sess.started_at,
           CASE WHEN r.id IS NULL THEN 'missed' ELSE 'late' END AS kind
      FROM sess
      LEFT JOIN camp201_checkin_responses r ON r.session_id = sess.id AND r.camper_id = p_camper
     WHERE r.timing = 'late'
        OR (r.id IS NULL AND NOT EXISTS (
              SELECT 1 FROM camp201_absence_requests ar
               WHERE ar.camper_id = p_camper AND ar.status = 'approved'
                 AND ar.start_time <= sess.timer_ends_at + INTERVAL '1 minute'
                 AND ar.end_time >= sess.started_at))
  ),
  numbered AS (
    SELECT h.session_id, h.kind, (ROW_NUMBER() OVER (ORDER BY h.started_at, h.session_id))::int AS n
      FROM hits h
  )
  SELECT session_id, kind, n, camp201_checkin_strike_rate(n) FROM numbered;
$fn$;

-- Brings one cAMPer's logged penalties in line with their strikes. Re-run any time: it only logs
-- the difference, so it also gives points back when a check-in is back-filled or excused.
-- Returns the total points change it logged.
CREATE OR REPLACE FUNCTION camp201_sync_checkin_penalties(p_camper INTEGER) RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
  me RECORD;
  rec RECORD;
  desired INTEGER;
  delta INTEGER;
  total_delta INTEGER := 0;
BEGIN
  SELECT id, cohort_id, removed_at INTO me FROM camp201_campers WHERE id = p_camper;
  IF NOT FOUND OR me.cohort_id IS NULL OR me.removed_at IS NOT NULL OR camp201_cohort_frozen(me.cohort_id) THEN
    RETURN 0;
  END IF;
  -- One sync per cAMPer at a time, so two check-ins landing together can't double-charge.
  PERFORM pg_advisory_xact_lock(732001, p_camper);

  FOR rec IN
    WITH strikes AS (SELECT * FROM camp201_checkin_strikes(p_camper)),
    touched AS (
      SELECT s.session_id FROM strikes s
      UNION
      SELECT pl.checkin_session_id FROM camp201_points_log pl
       WHERE pl.camper_id = p_camper AND pl.category = 'checkin_penalty' AND pl.checkin_session_id IS NOT NULL
    )
    SELECT t.session_id, st.kind, st.strike_no, COALESCE(st.rate, 0) AS rate,
           COALESCE((SELECT SUM(pl.points) FROM camp201_points_log pl
                      WHERE pl.camper_id = p_camper AND pl.category = 'checkin_penalty'
                        AND pl.checkin_session_id = t.session_id), 0)::int AS current_extra,
           COALESCE((SELECT SUM(pl.points) FROM camp201_points_log pl
                      WHERE pl.camper_id = p_camper
                        AND (pl.reason = 'Check-in: late (session ' || t.session_id || ')'
                             OR pl.reverses_id IN (
                               SELECT x.id FROM camp201_points_log x
                                WHERE x.camper_id = p_camper
                                  AND x.reason = 'Check-in: late (session ' || t.session_id || ')'))), 0)::int AS base_charged
      FROM touched t
      LEFT JOIN strikes st ON st.session_id = t.session_id
     ORDER BY t.session_id
  LOOP
    desired := CASE WHEN rec.kind IS NULL THEN 0 ELSE rec.rate - rec.base_charged END;
    delta := desired - rec.current_extra;
    IF delta <> 0 THEN
      INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category, checkin_session_id)
      VALUES (
        p_camper, delta,
        CASE
          WHEN rec.kind IS NULL THEN 'Check-in penalty removed (session ' || rec.session_id || ')'
          WHEN rec.current_extra <> 0 THEN 'Check-in penalty updated: late/missed #' || rec.strike_no || ' (session ' || rec.session_id || ')'
          WHEN rec.kind = 'missed' THEN 'Missed check-in #' || rec.strike_no || ' (session ' || rec.session_id || ')'
          ELSE 'Late check-in #' || rec.strike_no || ': repeat-lateness penalty (session ' || rec.session_id || ')'
        END,
        'system', 'checkin_penalty', rec.session_id);
      total_delta := total_delta + delta;
    END IF;
  END LOOP;

  RETURN total_delta;
END;
$fn$;

CREATE OR REPLACE FUNCTION camp201_sync_cohort_checkin_penalties(p_cohort INTEGER) RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
  c RECORD;
  total INTEGER := 0;
BEGIN
  IF p_cohort IS NULL OR camp201_cohort_frozen(p_cohort) THEN
    RETURN 0;
  END IF;
  FOR c IN SELECT id FROM camp201_campers WHERE cohort_id = p_cohort AND removed_at IS NULL ORDER BY id LOOP
    total := total + camp201_sync_checkin_penalties(c.id);
  END LOOP;
  RETURN total;
END;
$fn$;

-- The "see a counselor" memo (7+ late/missed) starts with the NEXT cohort.
INSERT INTO camp201_config (key, value, updated_at)
SELECT 'presence_memo_min_cohort_id', (COALESCE(MAX(id), 0) + 1)::text, NOW() FROM camp201_cohorts
ON CONFLICT (key) DO NOTHING;

-- Apply to the active cohort now.
SELECT camp201_sync_cohort_checkin_penalties(
  (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1));
