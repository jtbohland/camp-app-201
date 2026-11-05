-- cAMP 201: counselors never earn badges (matches 0016, which blocks their points).

-- Quietly skip badge awards for counselors (no error, so team-wide awards still run).
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

-- Remove badges counselors already hold.
DELETE FROM camp201_camper_badges cb
USING camp201_campers c
WHERE c.id = cb.camper_id
  AND (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email));
