-- Best Logo award: recorded on the live team when logo voting closes, then carried onto the
-- Legacy Wall when the cohort is archived (replaces the hard-coded list in the gallery).

ALTER TABLE camp201_teams ADD COLUMN IF NOT EXISTS best_logo BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE camp201_past_teams ADD COLUMN IF NOT EXISTS best_logo BOOLEAN NOT NULL DEFAULT false;

-- Past winners that were previously hard-coded in the gallery (matched by cohort + name, not id,
-- so this is correct in every environment).
UPDATE camp201_past_teams pt
SET best_logo = true
FROM camp201_past_cohorts pc
WHERE pc.id = pt.cohort_id
  AND (pc.cohort_number, pt.team_name) IN (
    (4, 'Trailblazers'),
    (5, 'The DataPuff Girls'),
    (6, 'chAMPiones'),
    (7, 'K-POP Data Hunters')
  );

-- Make sure the voting gate exists everywhere (locked until a counselor opens it).
INSERT INTO camp201_feature_gates (feature_key, label, is_locked)
VALUES ('logo_voting', 'Logo Voting', true)
ON CONFLICT (feature_key) DO NOTHING;
