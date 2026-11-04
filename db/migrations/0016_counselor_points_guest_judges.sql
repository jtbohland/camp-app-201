-- cAMP 201: counselors never earn points, guest judges, one rubric score per judge + notes.

-- 1) Counselors never earn points --------------------------------------------------------
-- A counselor is anyone with a counselor/admin role or on the verified admin list.
CREATE OR REPLACE FUNCTION camp201_is_admin_email(p_email TEXT) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $fn$
  SELECT p_email IS NOT NULL
     AND EXISTS (SELECT 1 FROM camp201_admins a WHERE lower(a.email) = lower(p_email));
$fn$;

-- Point totals: a counselor's total always stays at 0, whatever code path tries to add to it.
CREATE OR REPLACE FUNCTION camp201_zero_counselor_points() RETURNS TRIGGER
LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.role IN ('counselor', 'admin') OR camp201_is_admin_email(NEW.email) THEN
    NEW.points := 0;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS camp201_campers_no_counselor_points ON camp201_campers;
CREATE TRIGGER camp201_campers_no_counselor_points
  BEFORE INSERT OR UPDATE OF points, role, email ON camp201_campers
  FOR EACH ROW EXECUTE FUNCTION camp201_zero_counselor_points();

-- Point history: quietly skip entries for counselors (no error, so team-wide awards still run).
CREATE OR REPLACE FUNCTION camp201_skip_counselor_points_log() RETURNS TRIGGER
LANGUAGE plpgsql AS $fn$
BEGIN
  IF EXISTS (
    SELECT 1 FROM camp201_campers c
    WHERE c.id = NEW.camper_id
      AND (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email))
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS camp201_points_log_no_counselors ON camp201_points_log;
CREATE TRIGGER camp201_points_log_no_counselors
  BEFORE INSERT ON camp201_points_log
  FOR EACH ROW EXECUTE FUNCTION camp201_skip_counselor_points_log();

-- Reset: clear points counselors already earned (their history entries and their totals).
DELETE FROM camp201_points_log pl
USING camp201_campers c
WHERE c.id = pl.camper_id
  AND (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email));

UPDATE camp201_campers
SET points = 0
WHERE (role IN ('counselor', 'admin') OR camp201_is_admin_email(email))
  AND COALESCE(points, 0) <> 0;

-- 2) Guest judges -------------------------------------------------------------------------
-- Counselor access for one cohort. Access ends on its own when that cohort closes or a new
-- cohort becomes active. Guest judges have no camper profile, so they never appear in the
-- Counselor Cabin, the counselor rotation, or the cohort page.
CREATE TABLE IF NOT EXISTS camp201_guest_judges (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  cohort_id INTEGER NOT NULL,
  added_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  revoked_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS camp201_guest_judges_email_cohort
  ON camp201_guest_judges (lower(email), cohort_id);

-- 3) Rubric scores: one row per judge, summed for the team ---------------------------------
ALTER TABLE camp201_rubric_scores ADD COLUMN IF NOT EXISTS judge_email TEXT;
ALTER TABLE camp201_rubric_scores ADD COLUMN IF NOT EXISTS judge_name TEXT;
ALTER TABLE camp201_rubric_scores ADD COLUMN IF NOT EXISTS is_guest_judge BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE camp201_rubric_scores ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
-- Guest judges have no camper profile, so the scorer's camper id is optional.
ALTER TABLE camp201_rubric_scores ALTER COLUMN scored_by DROP NOT NULL;

-- Existing scores: record who scored them.
UPDATE camp201_rubric_scores rs
SET judge_email = lower(c.email),
    judge_name = NULLIF(trim(concat(c.first_name, ' ', c.last_name)), '')
FROM camp201_campers c
WHERE c.id = rs.scored_by AND rs.judge_email IS NULL;

-- Some older scores were saved under the wrong cohort. Use the scored team's cohort instead.
UPDATE camp201_rubric_scores rs
SET cohort_id = t.cohort_id
FROM camp201_teams t
WHERE t.id = rs.team_id
  AND t.cohort_id IS NOT NULL
  AND rs.cohort_id IS DISTINCT FROM t.cohort_id;
