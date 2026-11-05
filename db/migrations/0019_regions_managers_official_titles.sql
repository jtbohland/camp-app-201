-- cAMP 201 Update 21.1: three regions (NAMER / EMEA / APAC), "United States" typo cleanup,
-- managers filled in from the new-hire CSV, sharper title → role rules, and the
-- counselor-approved official titles + roles for the current cohort.

-- 1) Title → role rules -------------------------------------------------------------------
-- AE flavors only apply to Account Executive titles (so "Sales Strategy Manager" isn't an AE),
-- and "Customer Success Architect" is a CSA, not a TSM. "AE - Enterprise" (any dash) is exact.
-- Keep in sync with server/lib/roles.ts and client/lib/roles.ts.
CREATE OR REPLACE FUNCTION camp201_map_role(p TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN NULL
    WHEN d IN ('SDR', 'AE – Velocity', 'AE – Emerging', 'AE – Enterprise', 'AE – Strategic',
               'SE', 'CSA', 'TSM', 'Renewals', 'Partners', 'Value', 'Leadership') THEN d
    WHEN l IN ('counselor', 'admin') THEN l
    WHEN l ~ '(account executive|\mae\M)' AND l ~ 'strategic' THEN 'AE – Strategic'
    WHEN l ~ '(account executive|\mae\M)' AND l ~ 'emerging' THEN 'AE – Emerging'
    WHEN l ~ '(account executive|\mae\M)' AND l ~ '(velocity|commercial|mid-?market|corporate)' THEN 'AE – Velocity'
    WHEN l ~ '(account executive|\mae\M)' AND l ~ '(enterprise|major)' THEN 'AE – Enterprise'
    WHEN l ~ '(sales development|business development|\msdr\M|\mbdr\M)' THEN 'SDR'
    WHEN l ~ '(success architect|solutions? architect|engagement manager|\mcsa\M)' THEN 'CSA'
    WHEN l ~ '(solutions? engineer|sales engineer|pre-?sales|\mse\M)' THEN 'SE'
    WHEN l ~ 'renewal' THEN 'Renewals'
    WHEN l ~ '(technical success|customer success|\mtsm\M|\mcsm\M)' THEN 'TSM'
    WHEN l ~ 'partner' THEN 'Partners'
    WHEN l ~ 'value' THEN 'Value'
    WHEN l ~ '(vice president|\mavp\M|\mrvp\M|\mvp\M|director|head of|manager|leader|\mlead\M|chief|\mcro\M)' THEN 'Leadership'
    ELSE NULL
  END
  FROM (SELECT lower(btrim(p)) AS l,
               regexp_replace(btrim(p), '\s*[-–—]\s*', ' – ', 'g') AS d) s;
$fn$;

-- 2) Countries: same aliases as 0017, plus typos like "Unites States of America" ----------
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
    WHEN l ~ '^(the )?unit[a-z]* stat' THEN 'United States'
    WHEN l IN ('uk', 'u.k.', 'united kingdom', 'the united kingdom', 'great britain', 'britain',
               'england', 'scotland', 'wales', 'northern ireland', 'london') THEN 'United Kingdom'
    WHEN l ~ '^(the )?unit[a-z]* king' THEN 'United Kingdom'
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

-- 3) Regions: NAMER / EMEA / APAC. The country decides when it's known, else the stated region.
-- Latin America rolls up to NAMER. Keep in sync with server/lib/regions.ts and client/lib/regions.ts.
CREATE OR REPLACE FUNCTION camp201_map_region(p_region TEXT, p_country TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE
    WHEN c IN ('United States', 'Canada', 'Mexico', 'Brazil', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Costa Rica',
               'Puerto Rico', 'Uruguay', 'Ecuador', 'Venezuela', 'Guatemala', 'Panama', 'Dominican Republic',
               'Bolivia', 'Paraguay', 'Honduras', 'El Salvador', 'Nicaragua', 'Jamaica', 'Bahamas',
               'Trinidad and Tobago', 'Barbados') THEN 'NAMER'
    WHEN c IN ('Australia', 'New Zealand', 'Japan', 'South Korea', 'China', 'Hong Kong', 'Taiwan', 'Singapore',
               'India', 'Indonesia', 'Malaysia', 'Philippines', 'Thailand', 'Vietnam', 'Pakistan', 'Bangladesh',
               'Sri Lanka', 'Nepal', 'Cambodia', 'Myanmar', 'Mongolia', 'Brunei', 'Fiji') THEN 'APAC'
    WHEN c IN ('United Kingdom', 'Ireland', 'France', 'Germany', 'Spain', 'Italy', 'Netherlands', 'Belgium',
               'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Iceland', 'Poland', 'Portugal',
               'Czechia', 'Slovakia', 'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Croatia', 'Serbia', 'Slovenia',
               'Estonia', 'Latvia', 'Lithuania', 'Luxembourg', 'Ukraine', 'Israel', 'United Arab Emirates',
               'Saudi Arabia', 'Qatar', 'Kuwait', 'Bahrain', 'Oman', 'Jordan', 'Lebanon', 'Turkey', 'Egypt',
               'Morocco', 'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Cyprus', 'Malta') THEN 'EMEA'
    WHEN r IN ('namer', 'na', 'n. america', 'north america', 'amer', 'americas', 'the americas', 'us', 'usa',
               'united states', 'canada', 'latam', 'latin america', 'south america', 'central america') THEN 'NAMER'
    WHEN r IN ('emea', 'europe', 'eu', 'uk', 'uki', 'middle east', 'africa', 'mea', 'dach', 'nordics', 'benelux') THEN 'EMEA'
    WHEN r IN ('apac', 'apj', 'asia', 'asia pacific', 'asia-pacific', 'anz', 'japan', 'australia', 'sea', 'greater china') THEN 'APAC'
    ELSE NULLIF(btrim(COALESCE(p_region, '')), '')
  END
  FROM (SELECT lower(btrim(COALESCE(p_region, ''))) AS r, camp201_map_country(p_country) AS c) s;
$fn$;

UPDATE camp201_campers
SET country = camp201_map_country(country)
WHERE country IS NOT NULL AND country IS DISTINCT FROM camp201_map_country(country);

UPDATE camp201_campers
SET region = camp201_map_region(region, country)
WHERE camp201_map_region(region, country) IS NOT NULL
  AND region IS DISTINCT FROM camp201_map_region(region, country);

UPDATE camp201_new_hires
SET region = camp201_map_region(region, NULL)
WHERE camp201_map_region(region, NULL) IS NOT NULL
  AND region IS DISTINCT FROM camp201_map_region(region, NULL);

UPDATE camp201_managers
SET region = camp201_map_region(region, NULL)
WHERE camp201_map_region(region, NULL) IS NOT NULL
  AND region IS DISTINCT FROM camp201_map_region(region, NULL);

-- 4) Managers: the counselor's CSV is the source of truth ----------------------------------
UPDATE camp201_campers c
SET manager = COALESCE(NULLIF(btrim(nh.manager_name), ''), c.manager),
    manager_email = COALESCE(NULLIF(btrim(c.manager_email), ''), NULLIF(lower(btrim(nh.manager_email)), ''))
FROM (
  SELECT DISTINCT ON (lower(email)) email, manager_name, manager_email
  FROM camp201_new_hires
  ORDER BY lower(email), updated_at DESC NULLS LAST, id DESC
) nh
WHERE lower(nh.email) = lower(c.email)
  AND COALESCE(c.role, '') NOT IN ('counselor', 'admin')
  AND (NULLIF(btrim(nh.manager_name), '') IS NOT NULL OR NULLIF(btrim(nh.manager_email), '') IS NOT NULL);

-- Placeholder answers like "Other" are not a manager.
UPDATE camp201_campers
SET manager = ''
WHERE lower(btrim(COALESCE(manager, ''))) IN ('other', 'n/a', 'na', 'none', '-', 'tbd', 'unknown', '?');

-- 5) Official titles + roles approved by the counselors -----------------------------------
-- Updates Cohort Management for everyone on the list, then the cAMPer's role only for people
-- who are Accepted (attending) and registered in the app. Names match ignoring case,
-- spaces and punctuation, so "Raine O'Brien" / "Raine O’Brien" both match.
WITH fix(full_name, official_title, std_role) AS (
  VALUES
    ('Adriaan Smits', 'Partner Delivery Manager', 'Partners'),
    ('Lucas Harras', 'Senior Customer Success Architect', 'CSA'),
    ('Yusuke Fujino', 'Enterprise Account Executive', 'AE – Enterprise'),
    ('Nick Woods', 'Sr. Technical Success Manager II', 'TSM'),
    ('Martin Baltazar', 'Sr Technical Success Manager II', 'TSM'),
    ('Celin Teo', 'Senior Technical Success Manager', 'TSM'),
    ('Atul Grover', 'Senior Customer Success Architect', 'CSA'),
    ('Juan Polanco', 'Senior Technical Success Manager', 'TSM'),
    ('Annie Cimperman', 'Sales Development Representative', 'SDR'),
    ('Nina Statler', 'Sales Development Representative', 'SDR'),
    ('Tanvi Agarwalla', 'Senior Customer Success Architect II', 'CSA'),
    ('Taylor Jefferson', 'Sales Development Representative', 'SDR'),
    ('Sky Evans', 'Sales Development Representative', 'SDR'),
    ('Aditya Bharadwaj', 'Sr. Customer Success Architect II', 'CSA'),
    ('David Halk', 'Senior Sales Engineer', 'SE'),
    ('Oluseun Oniyide', 'Sr. Technical Success Manager II', 'TSM'),
    ('Samyak Jain', 'Senior Customer Success Architect II', 'CSA'),
    ('Dan Soto', 'Emerging Enterprise Account Executive', 'AE – Emerging'),
    ('Silvia Garcia', 'Technical Trainer - EMEA', 'CSA'),
    ('Ashley Metcalfe', 'Senior Sales Strategy & Operations Manager', 'Leadership'),
    ('Aaron Benson', 'Major Enterprise Account Executive', 'AE – Enterprise'),
    ('Mehdi Nazim Badache', 'Sr Sales Engineer', 'SE'),
    ('Matthew Klingner', 'Enterprise Account Executive', 'AE – Enterprise'),
    ('Adam Morse', 'Strategic Account Executive', 'AE – Strategic'),
    ('Jontia Brown', 'Senior Technical Success Manager', 'TSM'),
    ('Ishanee Rudra', 'Senior Solutions Engineer', 'SE'),
    ('Raine O''Brien', 'Sales Development Representative', 'SDR'),
    ('Mathias Moehlis', 'Enterprise Account Executive', 'AE – Enterprise'),
    ('Hayley Anderson', 'Sr Technical Success Manager', 'TSM')
), keyed AS (
  SELECT regexp_replace(lower(full_name), '[^a-z]', '', 'g') AS k, official_title, std_role FROM fix
), hires AS (
  UPDATE camp201_new_hires nh
  SET original_title = k.official_title,
      role_title = k.std_role,
      role_needs_review = false,
      updated_at = NOW()
  FROM keyed k
  WHERE regexp_replace(lower(COALESCE(nh.first_name, '') || COALESCE(nh.last_name, '')), '[^a-z]', '', 'g') = k.k
     OR regexp_replace(lower(split_part(nh.email, '@', 1)), '[^a-z]', '', 'g') = k.k
  RETURNING nh.email, nh.status, nh.role_title
)
UPDATE camp201_campers c
SET role = h.role_title,
    csv_role = h.role_title,
    role_needs_review = false,
    updated_at = NOW()
FROM hires h
WHERE lower(h.email) = lower(c.email)
  AND h.status = 'accepted'
  AND c.removed_at IS NULL
  AND COALESCE(c.role, '') NOT IN ('counselor', 'admin');
