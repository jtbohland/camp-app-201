-- cAMP 201 Update 21: speaker access, excused absence limits, Local flights,
-- standard roles + countries (with one-time cleanup), counselors never earn badges.

-- 1) Speakers -----------------------------------------------------------------------------
ALTER TABLE camp201_executives ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE camp201_executives ADD COLUMN IF NOT EXISTS slack_name TEXT;
-- Set the first time a counselor copies the speaker's share link.
ALTER TABLE camp201_executives ADD COLUMN IF NOT EXISTS link_copied_at TIMESTAMPTZ;

-- Speaker replies stay visible after Q&A closes for cAMPers.
ALTER TABLE camp201_exec_questions ADD COLUMN IF NOT EXISTS answer_text TEXT;
ALTER TABLE camp201_exec_questions ADD COLUMN IF NOT EXISTS answered_at TIMESTAMPTZ;
ALTER TABLE camp201_exec_questions ADD COLUMN IF NOT EXISTS answered_by TEXT;

-- 2) Excused absences ---------------------------------------------------------------------
-- standard            = one of the 3 included absences
-- counselor_penalty   = approved by a counselor beyond the limit (-1 pt at Close cAMP)
-- counselor_emergency = approved by a counselor beyond the limit, no penalty
ALTER TABLE camp201_absence_requests ADD COLUMN IF NOT EXISTS approval_type TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE camp201_absence_requests ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE camp201_absence_requests ADD COLUMN IF NOT EXISTS cohort_id INTEGER;
UPDATE camp201_absence_requests ar
SET cohort_id = c.cohort_id
FROM camp201_campers c
WHERE c.id = ar.camper_id AND ar.cohort_id IS NULL;

-- 3) Flights: local cAMPers don't fly ------------------------------------------------------
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS flight_is_local BOOLEAN NOT NULL DEFAULT false;

-- 4) Standard roles -----------------------------------------------------------------------
-- csv_role: the role from the counselor's new-hire CSV (when it matched one of the 12 roles).
-- role_needs_review: the stored role couldn't be matched to one of the 12 roles.
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS csv_role TEXT;
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS role_needs_review BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE camp201_new_hires ADD COLUMN IF NOT EXISTS original_title TEXT;
ALTER TABLE camp201_new_hires ADD COLUMN IF NOT EXISTS role_needs_review BOOLEAN NOT NULL DEFAULT false;

-- Maps any job title to one of the 12 standard roles, or NULL when it can't tell.
-- Keep in sync with server/lib/roles.ts and client/lib/roles.ts.
CREATE OR REPLACE FUNCTION camp201_map_role(p TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN NULL
    WHEN btrim(p) IN ('SDR', 'AE – Velocity', 'AE – Emerging', 'AE – Enterprise', 'AE – Strategic',
                      'SE', 'CSA', 'TSM', 'Renewals', 'Partners', 'Value', 'Leadership') THEN btrim(p)
    WHEN l IN ('counselor', 'admin') THEN l
    WHEN l ~ 'strategic' THEN 'AE – Strategic'
    WHEN l ~ 'emerging' THEN 'AE – Emerging'
    WHEN l ~ 'velocity' THEN 'AE – Velocity'
    WHEN l ~ 'enterprise' AND l !~ '(vice president|\mavp\M|\mvp\M|director|manager|head of)' THEN 'AE – Enterprise'
    WHEN l ~ '(sales development|business development|\msdr\M|\mbdr\M)' THEN 'SDR'
    WHEN l ~ '(solutions? architect|engagement manager|\mcsa\M)' THEN 'CSA'
    WHEN l ~ '(solutions? engineer|sales engineer|pre-?sales|\mse\M)' THEN 'SE'
    WHEN l ~ 'renewal' THEN 'Renewals'
    WHEN l ~ '(technical success|customer success|\mtsm\M|\mcsm\M)' THEN 'TSM'
    WHEN l ~ 'partner' THEN 'Partners'
    WHEN l ~ 'value' THEN 'Value'
    WHEN l ~ '(vice president|\mavp\M|\mrvp\M|\mvp\M|director|head of|manager|leadership|\mlead\M|chief|\mcro\M)' THEN 'Leadership'
    ELSE NULL
  END
  FROM (SELECT lower(btrim(p)) AS l) s;
$fn$;

-- Existing cAMPers: move matched titles to the standard role, flag the rest for a counselor.
UPDATE camp201_campers
SET role = camp201_map_role(role), role_needs_review = false
WHERE camp201_map_role(role) IS NOT NULL
  AND role IS DISTINCT FROM camp201_map_role(role);

UPDATE camp201_campers
SET role_needs_review = (camp201_map_role(role) IS NULL)
WHERE COALESCE(role, '') NOT IN ('counselor', 'admin');

-- New-hire CSV rows: keep the original title, store the standard role, flag unmatched titles.
UPDATE camp201_new_hires SET original_title = role_title
WHERE original_title IS NULL AND role_title IS NOT NULL;

UPDATE camp201_new_hires
SET role_title = camp201_map_role(role_title), role_needs_review = false
WHERE camp201_map_role(role_title) IS NOT NULL;

UPDATE camp201_new_hires
SET role_needs_review = true
WHERE role_title IS NOT NULL AND camp201_map_role(role_title) IS NULL;

-- Remember each cAMPer's CSV role so a later change can be flagged.
UPDATE camp201_campers c
SET csv_role = nh.role_title
FROM camp201_new_hires nh
WHERE lower(nh.email) = lower(c.email)
  AND nh.role_needs_review = false
  AND nh.role_title IS NOT NULL
  AND c.csv_role IS NULL;

-- 5) Standard countries -------------------------------------------------------------------
-- Maps aliases, local spellings, US states, and a few big cities to one country name.
-- Keep in sync with client/lib/countries.ts.
CREATE OR REPLACE FUNCTION camp201_map_country(p TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN NULL
    WHEN l IN ('usa', 'us', 'u.s.', 'u.s.a.', 'u.s', 'united states', 'united states of america',
               'the united states', 'america', 'nyc', 'sf', 'bay area', 'san francisco', 'new york city',
               'washington dc', 'washington d.c.', 'dc', 'd.c.',
               'alabama', 'alaska', 'arizona', 'arkansas', 'california', 'colorado', 'connecticut',
               'delaware', 'florida', 'georgia, usa', 'hawaii', 'idaho', 'illinois', 'indiana', 'iowa',
               'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts', 'michigan',
               'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska', 'nevada', 'new hampshire',
               'new jersey', 'new mexico', 'new york', 'north carolina', 'north dakota', 'ohio',
               'oklahoma', 'oregon', 'pennsylvania', 'rhode island', 'south carolina', 'south dakota',
               'tennessee', 'texas', 'utah', 'vermont', 'virginia', 'washington', 'west virginia',
               'wisconsin', 'wyoming') THEN 'United States'
    WHEN l IN ('uk', 'u.k.', 'united kingdom', 'the united kingdom', 'great britain', 'britain',
               'england', 'scotland', 'wales', 'northern ireland', 'london') THEN 'United Kingdom'
    WHEN l IN ('nederland', 'netherlands', 'the netherlands', 'holland', 'amsterdam') THEN 'Netherlands'
    WHEN l IN ('uae', 'u.a.e.', 'united arab emirates', 'the united arab emirates', 'dubai', 'abu dhabi') THEN 'United Arab Emirates'
    WHEN l IN ('deutschland', 'germany', 'berlin', 'munich', 'münchen') THEN 'Germany'
    WHEN l IN ('españa', 'espana', 'spain', 'madrid', 'barcelona') THEN 'Spain'
    WHEN l IN ('brasil', 'brazil', 'são paulo', 'sao paulo') THEN 'Brazil'
    WHEN l IN ('korea', 's. korea', 'south korea', 'republic of korea', 'korea, republic of', 'seoul') THEN 'South Korea'
    WHEN l IN ('ksa', 'saudi', 'saudi arabia', 'kingdom of saudi arabia') THEN 'Saudi Arabia'
    WHEN l IN ('italia', 'italy') THEN 'Italy'
    WHEN l IN ('méxico', 'mexico') THEN 'Mexico'
    WHEN l IN ('türkiye', 'turkiye', 'turkey') THEN 'Turkey'
    WHEN l IN ('france', 'paris') THEN 'France'
    WHEN l IN ('australia', 'sydney', 'melbourne') THEN 'Australia'
    WHEN l IN ('canada', 'toronto', 'vancouver') THEN 'Canada'
    WHEN l IN ('japan', 'nippon', 'tokyo') THEN 'Japan'
    WHEN l IN ('india', 'bharat', 'bangalore', 'bengaluru') THEN 'India'
    WHEN l IN ('singapore') THEN 'Singapore'
    WHEN l IN ('ireland', 'éire', 'eire', 'dublin') THEN 'Ireland'
    WHEN l IN ('israel', 'tel aviv') THEN 'Israel'
    WHEN l IN ('colombia', 'bogota', 'bogotá') THEN 'Colombia'
    ELSE btrim(p)
  END
  FROM (SELECT lower(btrim(p)) AS l) s;
$fn$;

UPDATE camp201_campers
SET country = camp201_map_country(country)
WHERE country IS NOT NULL
  AND country IS DISTINCT FROM camp201_map_country(country);

-- 6) Counselors never earn badges ---------------------------------------------------------
CREATE OR REPLACE FUNCTION camp201_skip_counselor_badges() RETURNS TRIGGER
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

DROP TRIGGER IF EXISTS camp201_camper_badges_no_counselors ON camp201_camper_badges;
CREATE TRIGGER camp201_camper_badges_no_counselors
  BEFORE INSERT ON camp201_camper_badges
  FOR EACH ROW EXECUTE FUNCTION camp201_skip_counselor_badges();

DELETE FROM camp201_camper_badges cb
USING camp201_campers c
WHERE c.id = cb.camper_id
  AND (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email));
