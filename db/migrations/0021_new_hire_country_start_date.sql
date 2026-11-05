-- cAMP 201 Update 21.3: Cohort Management keeps every CSV field, so a manually added cAMPer
-- has the same details as an uploaded one (and registration can pre-fill them).
ALTER TABLE camp201_new_hires ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE camp201_new_hires ADD COLUMN IF NOT EXISTS start_date DATE;

-- Backfill from registered cAMPers (the CSV upload already copied these onto their accounts).
UPDATE camp201_new_hires nh
SET country = COALESCE(nh.country, NULLIF(btrim(c.country), '')),
    start_date = COALESCE(nh.start_date, c.start_date)
FROM camp201_campers c
WHERE lower(c.email) = lower(nh.email)
  AND (nh.country IS NULL OR nh.start_date IS NULL);
