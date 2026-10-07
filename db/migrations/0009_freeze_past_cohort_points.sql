-- cAMP 201 - freeze points and badges for cohorts that have ended
-- A cohort is "frozen" once it has a saved snapshot and is no longer the active cohort.
-- Past cAMPers can still log in, so without this their totals (and old leaderboards) could drift.

CREATE OR REPLACE FUNCTION camp201_cohort_frozen(p_cohort_id INTEGER) RETURNS BOOLEAN
LANGUAGE sql STABLE AS $fn$
  SELECT p_cohort_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM camp201_cohort_snapshots s WHERE s.cohort_id = p_cohort_id)
     AND NOT EXISTS (SELECT 1 FROM camp201_cohorts c WHERE c.id = p_cohort_id AND c.is_active = true);
$fn$;

-- Point totals: keep the old value instead of failing, so unrelated profile edits still save.
CREATE OR REPLACE FUNCTION camp201_keep_frozen_points() RETURNS TRIGGER
LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.points IS DISTINCT FROM OLD.points AND camp201_cohort_frozen(OLD.cohort_id) THEN
    NEW.points := OLD.points;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS camp201_campers_freeze_points ON camp201_campers;
CREATE TRIGGER camp201_campers_freeze_points
  BEFORE UPDATE OF points ON camp201_campers
  FOR EACH ROW EXECUTE FUNCTION camp201_keep_frozen_points();

CREATE OR REPLACE FUNCTION camp201_keep_frozen_team_points() RETURNS TRIGGER
LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.team_points IS DISTINCT FROM OLD.team_points AND camp201_cohort_frozen(OLD.cohort_id) THEN
    NEW.team_points := OLD.team_points;
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS camp201_teams_freeze_points ON camp201_teams;
CREATE TRIGGER camp201_teams_freeze_points
  BEFORE UPDATE OF team_points ON camp201_teams
  FOR EACH ROW EXECUTE FUNCTION camp201_keep_frozen_team_points();

-- New point-log entries and badges: reject with a clear message.
CREATE OR REPLACE FUNCTION camp201_block_frozen_award() RETURNS TRIGGER
LANGUAGE plpgsql AS $fn$
BEGIN
  IF camp201_cohort_frozen((SELECT cohort_id FROM camp201_campers WHERE id = NEW.camper_id)) THEN
    RAISE EXCEPTION 'cAMP has ended for this cohort. Points and badges are final.';
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS camp201_points_log_freeze ON camp201_points_log;
CREATE TRIGGER camp201_points_log_freeze
  BEFORE INSERT ON camp201_points_log
  FOR EACH ROW EXECUTE FUNCTION camp201_block_frozen_award();

DROP TRIGGER IF EXISTS camp201_camper_badges_freeze ON camp201_camper_badges;
CREATE TRIGGER camp201_camper_badges_freeze
  BEFORE INSERT ON camp201_camper_badges
  FOR EACH ROW EXECUTE FUNCTION camp201_block_frozen_award();
