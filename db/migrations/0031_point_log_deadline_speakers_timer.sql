-- cAMP 201 Update 41
-- 1) The point log is the source of truth: every log entry updates the cAMPer's total.
-- 2) Pre-work deadline (Monday 9:00 AM PT by default) helpers.
-- 3) Catch-up: audit balances, registration (+10) and complete-profile (+15) points.
-- 4) Speakers link to an agenda session. 5) Shared session timer.

-- ── 1a. Every log entry carries its cohort ────────────────────────────────────────────
CREATE OR REPLACE FUNCTION camp201_points_log_fill_cohort() RETURNS TRIGGER
LANGUAGE plpgsql AS $fn$
BEGIN
  IF NEW.cohort_id IS NULL THEN
    NEW.cohort_id := (SELECT cohort_id FROM camp201_campers WHERE id = NEW.camper_id);
  END IF;
  RETURN NEW;
END;
$fn$;

DROP TRIGGER IF EXISTS camp201_points_log_a_fill_cohort ON camp201_points_log;
CREATE TRIGGER camp201_points_log_a_fill_cohort
  BEFORE INSERT ON camp201_points_log
  FOR EACH ROW EXECUTE FUNCTION camp201_points_log_fill_cohort();

UPDATE camp201_points_log pl
SET cohort_id = c.cohort_id
FROM camp201_campers c
WHERE c.id = pl.camper_id AND pl.cohort_id IS NULL AND c.cohort_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_points_log_camper_created ON camp201_points_log (camper_id, created_at, id);
CREATE INDEX IF NOT EXISTS idx_points_log_cohort_created ON camp201_points_log (cohort_id, created_at DESC);

-- ── 1b. Audit balance: make each live cAMPer's log add up to their total ──────────────
-- Team awards (logo vote, EBR score) are copied onto each member's history so they can see them,
-- but they count once, on the team total. Tag them so they never add to a cAMPer's own total.
UPDATE camp201_points_log
SET category = 'team_award'
WHERE COALESCE(category, '') <> 'team_award'
  AND (reason LIKE 'Logo vote - %' OR reason LIKE 'EBR score (%');

-- Points added without a log entry (e.g. Wheel & Deal pitches): add one line for the difference.
INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
SELECT c.id, COALESCE(c.points, 0) - COALESCE(l.s, 0),
       'Audit balance: points earned before every award was logged', 'system', 'audit'
FROM camp201_campers c
LEFT JOIN (SELECT camper_id, SUM(points)::int AS s FROM camp201_points_log
           WHERE COALESCE(category, '') <> 'team_award' GROUP BY camper_id) l
  ON l.camper_id = c.id
WHERE COALESCE(c.points, 0) > COALESCE(l.s, 0)
  AND NOT camp201_cohort_frozen(c.cohort_id)
  AND NOT (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email));

-- Logged awards that never reached the total (e.g. counselor quick awards): raise the total.
UPDATE camp201_campers c
SET points = l.s
FROM (SELECT camper_id, SUM(points)::int AS s FROM camp201_points_log
      WHERE COALESCE(category, '') <> 'team_award' GROUP BY camper_id) l
WHERE l.camper_id = c.id AND COALESCE(c.points, 0) < l.s
  AND NOT camp201_cohort_frozen(c.cohort_id)
  AND NOT (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email));

-- ── 1c. From now on, writing a log entry is how points are awarded ─────────────────────
CREATE OR REPLACE FUNCTION camp201_apply_points_log() RETURNS TRIGGER
LANGUAGE plpgsql AS $fn$
BEGIN
  -- Team awards are shown on members' history but count only on the team total.
  IF COALESCE(NEW.points, 0) <> 0 AND COALESCE(NEW.category, '') <> 'team_award' THEN
    UPDATE camp201_campers SET points = COALESCE(points, 0) + NEW.points WHERE id = NEW.camper_id;
  END IF;
  RETURN NULL;
END;
$fn$;

DROP TRIGGER IF EXISTS camp201_points_log_z_apply ON camp201_points_log;
CREATE TRIGGER camp201_points_log_z_apply
  AFTER INSERT ON camp201_points_log
  FOR EACH ROW EXECUTE FUNCTION camp201_apply_points_log();

-- ── 2. Pre-work deadline ───────────────────────────────────────────────────────────────
-- The Settings value is a Pacific-time date + time. Blank = cAMP start date at 9:00 AM PT.
CREATE OR REPLACE FUNCTION camp201_prework_deadline() RETURNS TIMESTAMPTZ
LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  v TEXT;
  s TEXT;
BEGIN
  SELECT NULLIF(btrim(value), '') INTO v FROM camp201_config WHERE key = 'prework_deadline';
  IF v IS NOT NULL THEN
    BEGIN
      RETURN (v::timestamp) AT TIME ZONE 'America/Los_Angeles';
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
  SELECT NULLIF(btrim(value), '') INTO s FROM camp201_config WHERE key = 'camp_start_date';
  IF s IS NOT NULL THEN
    BEGIN
      RETURN (s::date + time '09:00') AT TIME ZONE 'America/Los_Angeles';
    EXCEPTION WHEN others THEN
      NULL;
    END;
  END IF;
  RETURN NULL;
END;
$fn$;

INSERT INTO camp201_config (key, value) VALUES ('deadline_penalty_incomplete', '10')
ON CONFLICT (key) DO NOTHING;

-- Whole-number config value, or the default when blank or not a number.
CREATE OR REPLACE FUNCTION camp201_config_int(p_key TEXT, p_default INTEGER) RETURNS INTEGER
LANGUAGE sql STABLE AS $fn$
  SELECT COALESCE(
    (SELECT btrim(value)::int FROM camp201_config WHERE key = p_key AND btrim(value) ~ '^-?[0-9]+$' LIMIT 1),
    p_default);
$fn$;

-- One early-bird bonus and one missed-deadline penalty per cAMPer, ever.
CREATE UNIQUE INDEX IF NOT EXISTS uq_points_log_prework_penalty
  ON camp201_points_log (camper_id) WHERE category = 'prework_penalty';
CREATE UNIQUE INDEX IF NOT EXISTS uq_points_log_prework_early_bird
  ON camp201_points_log (camper_id) WHERE category = 'prework_early_bird';

-- Early bird: all pre-work finished 2+ days before the deadline (default +15),
-- or 1-2 days before (default +10). Based on when the last task was finished. Safe to repeat.
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
  SELECT MAX(p.completed_at) INTO finished
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

-- Missed deadline: one penalty (default -10) for each active cAMPer whose pre-work wasn't all
-- finished by the deadline. Does nothing before the deadline. Safe to repeat.
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
    AND NOT (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email))
    AND EXISTS (
      SELECT 1 FROM camp201_journey_content jc
      WHERE jc.section = 'prework' AND jc.item_key IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM camp201_prework p
                        WHERE p.user_id = c.id AND p.item = jc.item_key
                          AND p.completed = true AND p.completed_at < d))
  ON CONFLICT (camper_id) WHERE category = 'prework_penalty' DO NOTHING;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$fn$;

-- Registration +10, once, for a cAMPer with every required registration field. Safe to repeat.
CREATE OR REPLACE FUNCTION camp201_award_registration(p_camper INTEGER) RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE n INTEGER;
BEGIN
  INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
  SELECT c.id, 10, 'Registration completed', 'system', 'registration'
  FROM camp201_campers c
  WHERE c.id = p_camper AND c.removed_at IS NULL
    AND NOT (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email))
    AND btrim(COALESCE(c.first_name, '')) <> '' AND btrim(COALESCE(c.last_name, '')) <> ''
    AND btrim(COALESCE(c.role, '')) NOT IN ('', 'camper')
    AND btrim(COALESCE(c.manager_email, '')) <> '' AND btrim(COALESCE(c.region, '')) <> ''
    AND btrim(COALESCE(c.country, '')) <> '' AND btrim(COALESCE(c.city, '')) <> ''
    AND c.start_date IS NOT NULL AND btrim(COALESCE(c.pin, '')) <> ''
    AND NOT EXISTS (SELECT 1 FROM camp201_points_log pl
                    WHERE pl.camper_id = c.id AND pl.reason = 'Registration completed');
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN CASE WHEN n > 0 THEN 10 ELSE 0 END;
END;
$fn$;

-- Number of answered ice-breaker questions (16 are required).
CREATE OR REPLACE FUNCTION camp201_ice_breaker_count(a JSONB) RETURNS INTEGER
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE WHEN jsonb_typeof(a) = 'object' THEN (
    SELECT COUNT(*)::int FROM jsonb_each(a) e
    WHERE jsonb_typeof(e.value) = 'string' AND btrim(e.value #>> '{}') <> ''
  ) ELSE 0 END;
$fn$;

-- ── 3. Catch-up for the active cohort ──────────────────────────────────────────────────
-- Registration: everyone with every required registration field gets +10 once.
SELECT camp201_award_registration(c.id)
FROM camp201_campers c
WHERE c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
  AND NOT camp201_cohort_frozen(c.cohort_id);

-- Profile: the "complete" flag matches the actual profile.
UPDATE camp201_campers c
SET profile_completed = true
WHERE c.profile_completed IS NOT TRUE
  AND btrim(COALESCE(c.bio, '')) <> '' AND btrim(COALESCE(c.fun_fact, '')) <> ''
  AND btrim(COALESCE(c.goal_1, '')) <> '' AND btrim(COALESCE(c.goal_2, '')) <> ''
  AND btrim(COALESCE(c.goal_3, '')) <> ''
  AND camp201_ice_breaker_count(c.ice_breaker_answers) >= 16;

-- Complete profiles get +15 once, only while the pre-work deadline hasn't passed.
INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
SELECT c.id, 15, 'Profile completed', 'system', 'profile'
FROM camp201_campers c
WHERE c.removed_at IS NULL
  AND c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
  AND NOT camp201_cohort_frozen(c.cohort_id)
  AND NOT (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email))
  AND c.profile_completed = true
  AND (camp201_prework_deadline() IS NULL OR NOW() < camp201_prework_deadline())
  AND NOT EXISTS (SELECT 1 FROM camp201_points_log pl
                  WHERE pl.camper_id = c.id AND pl.reason = 'Profile completed');

-- Early bird for cAMPers who already finished all their pre-work.
SELECT camp201_award_prework_early_bird(c.id)
FROM camp201_campers c
WHERE c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
  AND NOT camp201_cohort_frozen(c.cohort_id)
  AND c.removed_at IS NULL;

-- ── 4. Speakers link to the agenda session they appear in ──────────────────────────────
ALTER TABLE camp201_executives
  ADD COLUMN IF NOT EXISTS agenda_item_id INTEGER REFERENCES camp201_agenda(id) ON DELETE SET NULL;

-- ── 5. Shared session timer (one row; counselors control it, everyone sees it) ─────────
CREATE TABLE IF NOT EXISTS camp201_shared_timer (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  label TEXT NOT NULL DEFAULT '',
  total_seconds INTEGER NOT NULL DEFAULT 600,
  remaining_seconds INTEGER NOT NULL DEFAULT 600,
  ends_at TIMESTAMPTZ,
  running BOOLEAN NOT NULL DEFAULT false,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO camp201_shared_timer (id) VALUES (1) ON CONFLICT (id) DO NOTHING;
