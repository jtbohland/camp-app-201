-- cAMP 201 Update 21.2: adds "Trainer" as the 13th standard role.
-- Technical Trainers (e.g. Silvia Garcia) were placeholders under CSA; move them to Trainer.
-- Keep in sync with server/lib/roles.ts and client/lib/roles.ts.

CREATE OR REPLACE FUNCTION camp201_map_role(p TEXT) RETURNS TEXT
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT CASE
    WHEN p IS NULL OR btrim(p) = '' THEN NULL
    WHEN d IN ('SDR', 'AE – Velocity', 'AE – Emerging', 'AE – Enterprise', 'AE – Strategic',
               'SE', 'CSA', 'TSM', 'Renewals', 'Partners', 'Value', 'Trainer', 'Leadership') THEN d
    WHEN l IN ('counselor', 'admin') THEN l
    WHEN l ~ '(account executive|\mae\M)' AND l ~ 'strategic' THEN 'AE – Strategic'
    WHEN l ~ '(account executive|\mae\M)' AND l ~ 'emerging' THEN 'AE – Emerging'
    WHEN l ~ '(account executive|\mae\M)' AND l ~ '(velocity|commercial|mid-?market|corporate)' THEN 'AE – Velocity'
    WHEN l ~ '(account executive|\mae\M)' AND l ~ '(enterprise|major)' THEN 'AE – Enterprise'
    WHEN l ~ '(\mtrainer\M|\minstructor\M)' THEN 'Trainer'
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

-- Cohort Management: any hire whose official title is a trainer title (Silvia Garcia today).
WITH hires AS (
  UPDATE camp201_new_hires
  SET role_title = 'Trainer', role_needs_review = false, updated_at = NOW()
  WHERE camp201_map_role(original_title) = 'Trainer'
    AND role_title IS DISTINCT FROM 'Trainer'
  RETURNING email, status
)
-- Their cAMPer accounts, only for people attending (Accepted) and registered.
UPDATE camp201_campers c
SET role = 'Trainer', csv_role = 'Trainer', role_needs_review = false, updated_at = NOW()
FROM hires h
WHERE lower(h.email) = lower(c.email)
  AND h.status = 'accepted'
  AND c.removed_at IS NULL
  AND COALESCE(c.role, '') NOT IN ('counselor', 'admin');
