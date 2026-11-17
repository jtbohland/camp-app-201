-- 0047: pre-work deadline penalty fix.
-- The penalty treated a finished pre-work item with no recorded finish time as "not done", while
-- the early bird (and the checklist cAMPers see) counted it as done. Result: cAMPers who finished
-- everything, even early-bird winners, were charged -10. Now every check uses the same rule:
-- an item is on time when it's finished and its finish time (or, if missing, when it was saved)
-- is before the deadline. Nobody who earned the early bird can be charged the penalty.

-- ── 1. Penalty: same "done on time" rule as the early bird and the points audit ─────────
CREATE OR REPLACE FUNCTION camp201_apply_prework_deadline_penalty() RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
  d TIMESTAMPTZ := camp201_prework_deadline();
  pen INTEGER := camp201_config_int('deadline_penalty_incomplete', 10);
  n INTEGER;
BEGIN
  IF d IS NULL OR NOW() < d OR pen <= 0 THEN RETURN 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM camp201_journey_content WHERE section = 'prework' AND item_key IS NOT NULL) THEN
    RETURN 0;
  END IF;
  INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
  SELECT c.id, -pen, 'Pre-work not all finished by the deadline', 'system', 'prework_penalty'
  FROM camp201_campers c
  WHERE c.removed_at IS NULL
    AND c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
    AND NOT camp201_cohort_frozen(c.cohort_id)
    AND NOT (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email))
    -- Early-bird winners finished everything early by definition.
    AND NOT EXISTS (SELECT 1 FROM camp201_points_log eb
                    WHERE eb.camper_id = c.id AND eb.category = 'prework_early_bird')
    AND EXISTS (
      SELECT 1 FROM camp201_journey_content jc
      WHERE jc.section = 'prework' AND jc.item_key IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM camp201_prework p
                        WHERE p.user_id = c.id AND p.item = jc.item_key AND p.completed = true
                          AND COALESCE(p.completed_at, p.created_at, '-infinity'::timestamptz) < d))
  ON CONFLICT (camper_id) WHERE category = 'prework_penalty' DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$fn$;

-- ── 2. Early bird: also fall back to when the item was saved if the finish time is missing ──
CREATE OR REPLACE FUNCTION camp201_award_prework_early_bird(p_camper INTEGER) RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
  d TIMESTAMPTZ := camp201_prework_deadline();
  finished TIMESTAMPTZ;
  hrs NUMERIC;
  pts INTEGER := 0;
  n INTEGER;
BEGIN
  IF d IS NULL THEN RETURN 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM camp201_journey_content WHERE section = 'prework' AND item_key IS NOT NULL) THEN
    RETURN 0;
  END IF;
  IF EXISTS (
    SELECT 1 FROM camp201_journey_content jc
    WHERE jc.section = 'prework' AND jc.item_key IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM camp201_prework p
                      WHERE p.user_id = p_camper AND p.item = jc.item_key AND p.completed = true)
  ) THEN
    RETURN 0;
  END IF;
  SELECT MAX(COALESCE(p.completed_at, p.created_at)) INTO finished
  FROM camp201_prework p
  JOIN camp201_journey_content jc ON jc.section = 'prework' AND jc.item_key = p.item
  WHERE p.user_id = p_camper AND p.completed = true;
  IF finished IS NULL OR finished >= d THEN RETURN 0; END IF;
  hrs := EXTRACT(EPOCH FROM (d - finished)) / 3600;
  IF hrs >= 48 THEN pts := camp201_config_int('early_bird_2day_bonus', 15);
  ELSIF hrs >= 24 THEN pts := camp201_config_int('early_bird_1day_bonus', 10);
  END IF;
  IF pts <= 0 THEN RETURN 0; END IF;
  INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
  VALUES (p_camper, pts,
          CASE WHEN hrs >= 48 THEN 'Early bird: all pre-work done 2+ days before the deadline'
               ELSE 'Early bird: all pre-work done 1-2 days before the deadline' END,
          'system', 'prework_early_bird')
  ON CONFLICT (camper_id) WHERE category = 'prework_early_bird' DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN CASE WHEN n > 0 THEN pts ELSE 0 END;
END;
$fn$;

-- ── 3. Remove this penalty from everyone in the active cohort ──────────────────────────
-- Offsetting entry that points at the original (the original stays, so it can never be
-- charged again). Skips anyone whose penalty was already removed.
INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category, reverses_id)
SELECT pl.camper_id, -pl.points,
       'Removed: pre-work deadline penalty (charged in error)', 'system', 'prework_penalty_reversed', pl.id
FROM camp201_points_log pl
JOIN camp201_campers c ON c.id = pl.camper_id
WHERE pl.category = 'prework_penalty'
  AND pl.points < 0
  AND c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM camp201_points_log r WHERE r.reverses_id = pl.id)
  AND NOT EXISTS (SELECT 1 FROM camp201_points_log r
                  WHERE r.camper_id = pl.camper_id AND r.category = 'prework_penalty_reversed')
ON CONFLICT (reverses_id) WHERE reverses_id IS NOT NULL DO NOTHING;
