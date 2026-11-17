-- Day 1 survey clean slate for the active cohort.
-- Keeps every submission that already exists. Anyone who hasn't submitted can now submit on time.

-- 1) Reopen Day 1: open and on time (full points, no late penalty, no reminder pop-up)
--    until a counselor locks it again.
INSERT INTO camp201_config (key, value)
VALUES ('survey_day_1_locked', 'open')
ON CONFLICT (key) DO UPDATE SET value = 'open';

-- 2) Undo any Day 1 late penalty in the active cohort (offsetting entry that points at the original).
INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category, reverses_id)
SELECT pl.camper_id, -pl.points,
       'Removed: Day 1 survey late penalty (survey reopened)', 'system', 'reversal', pl.id
FROM camp201_points_log pl
JOIN camp201_campers c ON c.id = pl.camper_id
JOIN camp201_cohorts co ON co.id = c.cohort_id AND co.is_active = true
WHERE pl.reason = 'Day 1 survey submitted late'
  AND pl.points < 0
  AND pl.reverses_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM camp201_points_log r WHERE r.reverses_id = pl.id)
ON CONFLICT (reverses_id) WHERE reverses_id IS NOT NULL DO NOTHING;

-- 3) Anyone whose Day 1 submission counted as late gets the normal on-time points (+2).
INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, cohort_id)
SELECT s.camper_id, 2, 'Day 1 survey completed (on time)', 'system', s.cohort_id
FROM camp201_daily_survey_submissions s
JOIN camp201_cohorts co ON co.id = s.cohort_id AND co.is_active = true
WHERE s.day_number = 1
  AND s.points_awarded <= 0
  AND NOT EXISTS (
    SELECT 1 FROM camp201_points_log pl
    WHERE pl.camper_id = s.camper_id AND pl.reason = 'Day 1 survey completed (on time)'
  );

UPDATE camp201_daily_survey_submissions s
SET points_awarded = 2
FROM camp201_cohorts co
WHERE co.id = s.cohort_id AND co.is_active = true
  AND s.day_number = 1
  AND s.points_awarded <= 0;
