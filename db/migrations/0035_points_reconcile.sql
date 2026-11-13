-- cAMP 201 Update 47: points you can trust.
-- 1) Point-log times carry a time zone. They were stored as UTC with no zone, so screens that read
--    them as local time showed every entry hours late.
-- 2) Pre-work awards are tagged 'prework' consistently, and each item can only ever earn once.
-- 3) camp201_reconcile_camper_points(): gives a cAMPer any points the rules say they earned but
--    never got (pre-work, registration, profile, early bird), then makes their total equal their
--    point history. Run once here for the active cohort; counselors can re-run it from Point Log.

-- ── 1. Time zone ───────────────────────────────────────────────────────────────────────
DO $do$
BEGIN
  IF (SELECT data_type FROM information_schema.columns
      WHERE table_name = 'camp201_points_log' AND column_name = 'created_at') = 'timestamp without time zone' THEN
    ALTER TABLE camp201_points_log
      ALTER COLUMN created_at TYPE TIMESTAMPTZ USING created_at AT TIME ZONE 'UTC';
  END IF;
END
$do$;
ALTER TABLE camp201_points_log ALTER COLUMN created_at SET DEFAULT NOW();

-- ── 2. Pre-work tagging + one award per item ───────────────────────────────────────────
UPDATE camp201_points_log
SET category = 'prework'
WHERE category IS DISTINCT FROM 'prework'
  AND (reason LIKE 'Pre-work completed: %' OR reason LIKE 'Flagged pre-work submission: %'
       OR reason LIKE 'Pre-work completed after deadline: %');

-- Only added when today's history has no duplicates, so this migration can never fail on old data.
DO $do$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM camp201_points_log
    WHERE category = 'prework' AND points > 0
    GROUP BY camper_id, reason HAVING COUNT(*) > 1
  ) THEN
    CREATE UNIQUE INDEX IF NOT EXISTS uq_points_log_prework_once
      ON camp201_points_log (camper_id, reason) WHERE category = 'prework' AND points > 0;
  END IF;
END
$do$;

-- ── 3. Reconcile one cAMPer ────────────────────────────────────────────────────────────
-- p_include_audited: cAMPers with an "Audit balance" line (points added before every award was
-- logged) are skipped unless a counselor asks, since that line may already cover missing awards.
-- Returns the points added. Safe to repeat: everything is awarded at most once.
CREATE OR REPLACE FUNCTION camp201_reconcile_camper_points(p_camper INTEGER, p_include_audited BOOLEAN DEFAULT false)
RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
  d TIMESTAMPTZ := camp201_prework_deadline();
  added INTEGER := 0;
  n INTEGER;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM camp201_campers c
    WHERE c.id = p_camper AND c.removed_at IS NULL
      AND NOT camp201_cohort_frozen(c.cohort_id)
      AND NOT (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email))
  ) THEN
    RETURN 0;
  END IF;
  IF NOT p_include_audited
     AND EXISTS (SELECT 1 FROM camp201_points_log WHERE camper_id = p_camper AND category = 'audit') THEN
    RETURN 0;
  END IF;

  -- Pre-work: +5 for each finished item with no award, penalty, or late note, finished before the
  -- deadline. Flagged submissions are left for a counselor (they should cost 3, not earn 5).
  WITH ins AS (
    INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
    SELECT p_camper, 5, 'Pre-work completed: ' || jc.item_key, 'points_audit', 'prework'
    FROM (SELECT DISTINCT item_key FROM camp201_journey_content
          WHERE section = 'prework' AND item_key IS NOT NULL) jc
    JOIN camp201_prework pw ON pw.user_id = p_camper AND pw.item = jc.item_key AND pw.completed = true
    WHERE (d IS NULL OR COALESCE(pw.completed_at, pw.created_at) < d)
      AND NOT EXISTS (
        SELECT 1 FROM camp201_points_log pl
        WHERE pl.camper_id = p_camper
          AND pl.reason IN ('Pre-work completed: ' || jc.item_key,
                            'Flagged pre-work submission: ' || jc.item_key,
                            'Pre-work completed after deadline: ' || jc.item_key))
      AND NOT EXISTS (
        SELECT 1 FROM camp201_prework_submissions s
        WHERE s.camper_id = p_camper AND s.item_key = jc.item_key AND s.flagged = true)
    RETURNING points
  )
  SELECT COALESCE(SUM(points), 0) INTO n FROM ins;
  added := added + n;

  -- Registration +10 (needs every registration field).
  added := added + COALESCE(camp201_award_registration(p_camper), 0);

  -- Complete profile +15, while the pre-work deadline hasn't passed.
  WITH ins AS (
    INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
    SELECT c.id, 15, 'Profile completed', 'points_audit', 'profile'
    FROM camp201_campers c
    WHERE c.id = p_camper AND c.profile_completed = true
      AND (d IS NULL OR NOW() < d)
      AND NOT EXISTS (SELECT 1 FROM camp201_points_log pl
                      WHERE pl.camper_id = c.id AND pl.reason = 'Profile completed')
    RETURNING points
  )
  SELECT COALESCE(SUM(points), 0) INTO n FROM ins;
  added := added + n;

  -- Early bird, now that pre-work is up to date.
  added := added + COALESCE(camp201_award_prework_early_bird(p_camper), 0);

  -- The point history is the source of truth: the total must equal it.
  UPDATE camp201_campers c
  SET points = l.s
  FROM (SELECT COALESCE(SUM(points), 0)::int AS s FROM camp201_points_log
        WHERE camper_id = p_camper AND COALESCE(category, '') <> 'team_award') l
  WHERE c.id = p_camper AND COALESCE(c.points, 0) <> l.s;

  RETURN added;
END;
$fn$;

-- ── 4. Run it for the active cohort ────────────────────────────────────────────────────
SELECT camp201_reconcile_camper_points(c.id, false)
FROM camp201_campers c
WHERE c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1);
