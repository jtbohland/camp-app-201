-- cAMP 201 - Link cAMPers to their real manager by work email.
-- Managers get "X listed you as their manager" suggestions on their dashboard.
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS manager_email TEXT;
CREATE INDEX IF NOT EXISTS idx_camp201_campers_manager_email
  ON camp201_campers (lower(manager_email));

-- One-time backfill for cAMPers who registered before this field existed.
-- Only fills blanks, so it never overwrites an email a cAMPer has entered.
-- Rows that don't exist in an environment (e.g. Dev) are simply skipped.
UPDATE camp201_campers c
SET manager_email = v.manager_email,
    updated_at = now()
FROM (VALUES
  ('aaron.benson@amplitude.com',     'alice.steels@amplitude.com'),
  ('celin.teo@amplitude.com',        'richard.prabhu@amplitude.com'),
  ('daniel.soto@amplitude.com',      'jeremy.grinbaum@amplitude.com'),
  ('david.halk@amplitude.com',       'becca.abusharkh@amplitude.com'),
  ('matthew.klingner@amplitude.com', 'nick.ryan@amplitude.com'),
  ('mehdi.badache@amplitude.com',    'kassim@amplitude.com'),
  ('nick.woods@amplitude.com',       'alex.simmons@amplitude.com'),
  ('tanvi.agarwalla@amplitude.com',  'piyush.agrawal@amplitude.com'),
  ('silvia.garcia@amplitude.com',    'amish@amplitude.com'),
  ('yusuke.fujino@amplitude.com',    'lee.edwards@amplitude.com')
) AS v(camper_email, manager_email)
WHERE lower(c.email) = v.camper_email
  AND (c.manager_email IS NULL OR c.manager_email = '');
