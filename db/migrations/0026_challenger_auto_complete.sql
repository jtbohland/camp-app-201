-- cAMP 201 Update 32: Challenger is auto-completed for roles that took it in cAMP Ascent
-- (SDR, all 4 AE roles, Renewals, Partners) and earns the same +5 pts as everyone else.
-- Keep the role list in sync with server/lib/challenger-exempt.ts.

CREATE OR REPLACE FUNCTION camp201_challenger_exempt(p TEXT) RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT p IS NOT NULL
     AND lower(btrim(p)) NOT IN ('', 'counselor', 'admin')
     AND (
       COALESCE(camp201_map_role(p), '') IN
         ('SDR', 'AE – Velocity', 'AE – Emerging', 'AE – Enterprise', 'AE – Strategic', 'Renewals', 'Partners')
       OR lower(p) ~ '(account executive|\mae\M)'
     );
$fn$;

-- Who this applies to: exempt, still attending, in the active cohort.
CREATE OR REPLACE VIEW camp201_challenger_exempt_campers AS
  SELECT c.id, c.role, c.cohort_id
  FROM camp201_campers c
  WHERE c.removed_at IS NULL
    AND camp201_challenger_exempt(c.role)
    AND c.cohort_id IN (SELECT id FROM camp201_cohorts WHERE is_active = true)
    AND NOT camp201_cohort_frozen(c.cohort_id);

-- 1. Record why Challenger was checked off (keeps any screenshots already submitted).
INSERT INTO camp201_prework_submissions (camper_id, item_key, submission_data, flagged)
SELECT e.id, 'challenger_sales',
       jsonb_build_object('auto_completed', true, 'reason', 'Role: ' || e.role || ' (completed Challenger in cAMP Ascent)'),
       false
FROM camp201_challenger_exempt_campers e
WHERE NOT EXISTS (
  SELECT 1 FROM camp201_prework pw
  WHERE pw.user_id = e.id AND pw.item = 'challenger_sales' AND pw.completed = true
)
ON CONFLICT (camper_id, item_key) DO NOTHING;

-- 2. Check off Challenger for everyone exempt who hasn't got it yet.
INSERT INTO camp201_prework (user_id, item, completed, completed_at)
SELECT e.id, 'challenger_sales', true, NOW()
FROM camp201_challenger_exempt_campers e
ON CONFLICT (user_id, item) DO UPDATE
  SET completed = true, completed_at = COALESCE(camp201_prework.completed_at, NOW())
  WHERE camp201_prework.completed IS NOT TRUE;

-- 3. +5 pts for every exempt cAMPer whose Challenger never earned points
--    (just auto-completed above, or checked off earlier under the old 0-pt rule).
WITH owed AS (
  SELECT e.id, e.cohort_id
  FROM camp201_challenger_exempt_campers e
  WHERE EXISTS (
          SELECT 1 FROM camp201_prework pw
          WHERE pw.user_id = e.id AND pw.item = 'challenger_sales' AND pw.completed = true)
    AND NOT EXISTS (
          SELECT 1 FROM camp201_points_log pl
          WHERE pl.camper_id = e.id
            AND pl.reason IN ('Pre-work completed: challenger_sales', 'Flagged pre-work submission: challenger_sales'))
),
logged AS (
  INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, cohort_id)
  SELECT id, 5, 'Pre-work completed: challenger_sales', 'system', cohort_id FROM owed
  RETURNING camper_id
)
UPDATE camp201_campers c
SET points = COALESCE(c.points, 0) + 5
FROM logged l
WHERE c.id = l.camper_id;
