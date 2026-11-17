-- 0050: Wheel & Deal scoring fix + backfill.
-- The pitcher's self-eval only submitted from the counselor's own screen, so on the pitcher's
-- device it silently did nothing. Close Scoring waited for that self-eval, so rounds stayed open
-- and no pitch points were awarded. Closing now happens in one place (this function), works with
-- or without a self-eval, and can only award points once per round.

-- ── 1. One wheel award per round ───────────────────────────────────────────────────────
ALTER TABLE camp201_points_log ADD COLUMN IF NOT EXISTS wheel_round_id INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS uq_points_log_wheel_round
  ON camp201_points_log (wheel_round_id) WHERE wheel_round_id IS NOT NULL;

-- ── 2. Close a round: room averages, points, award ─────────────────────────────────────
-- Points: +5 for pitching. With room votes: self-awareness +3 / +2 / +1 (self-eval within 1 /
-- within 2 / further from the room average) and +2 when the room average is 12 or more.
-- p_no_self_bonus is the self-awareness credit given when there is no self-eval (0 normally).
-- Returns the points awarded, or NULL when the round was already closed.
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
    ELSE
      awareness := GREATEST(COALESCE(p_no_self_bonus, 0), 0);
    END IF;
    IF st.total >= 12 THEN
      bonus := 2;
    END IF;
  END IF;
  pts := 5 + awareness + bonus;

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
         closed_at = NOW()
   WHERE id = p_round;

  INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category, wheel_round_id)
  VALUES (rnd.pitcher_id, pts, 'Wheel & Deal pitch (round ' || p_round || ')', 'system', 'wheel', p_round)
  ON CONFLICT (wheel_round_id) WHERE wheel_round_id IS NOT NULL DO NOTHING;

  RETURN pts;
END;
$fn$;

-- ── 3. Backfill the rounds that got stuck (active cohort only) ─────────────────────────
-- Pitchers couldn't submit a self-eval because of the bug, so they get full self-awareness
-- credit (+3) instead of losing it. Rounds nobody scored were never real pitches: cancel them
-- so they stop showing as "open".
UPDATE camp201_wheel_rounds w
   SET status = 'cancelled', closed_at = NOW()
  FROM camp201_campers c
 WHERE c.id = w.pitcher_id
   AND w.status = 'scoring'
   AND c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
   AND NOT camp201_cohort_frozen(c.cohort_id)
   AND NOT EXISTS (SELECT 1 FROM camp201_wheel_scores s WHERE s.round_id = w.id AND s.is_self_eval = FALSE);

SELECT camp201_close_wheel_round(w.id, 3)
  FROM camp201_wheel_rounds w
  JOIN camp201_campers c ON c.id = w.pitcher_id
 WHERE w.status = 'scoring'
   AND c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
   AND NOT camp201_cohort_frozen(c.cohort_id)
 ORDER BY w.id;
