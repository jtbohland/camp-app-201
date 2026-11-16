-- Counselors already scored "Value Pillars & Use Cases". Show those scores and judges' feedback
-- to every team now, even if a counted judge (e.g. a guest) didn't score every team.
-- Later presentations show automatically once every judge has scored a team.
UPDATE camp201_presentations
SET scores_revealed = true
WHERE title = 'Value Pillars & Use Cases'
  AND rubric_template_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM camp201_rubric_scores s WHERE s.template_id = camp201_presentations.rubric_template_id
  );

-- Logo vote tie-breaker: when cAMPers tie for 1st, each counselor casts one vote. One row per counselor per cohort.
CREATE TABLE IF NOT EXISTS camp201_logo_tiebreak_votes (
  id SERIAL PRIMARY KEY,
  cohort_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  voter_email TEXT NOT NULL,
  voter_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cohort_id, voter_email)
);
