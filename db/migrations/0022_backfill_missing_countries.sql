-- One-time fix: three Production cAMPers whose accounts were created by "Accepted" in Cohort
-- Management before that copied country from the new-hire list. All three are in the United States.
-- Only touches these three people, and only fields that are still blank. Does nothing in Dev.
UPDATE camp201_campers
SET country = 'United States',
    region = COALESCE(NULLIF(btrim(region), ''), 'NAMER'),
    updated_at = NOW()
WHERE (lower(btrim(first_name)), lower(btrim(last_name))) IN (
        ('jontia', 'brown'),
        ('taylor', 'jefferson'),
        ('sky', 'evans')
      )
  AND (country IS NULL OR btrim(country) = '');
