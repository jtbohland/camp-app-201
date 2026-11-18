-- 0052: Saved AI prep scripts for counselors role-playing executives in the Mini EBR.
-- One script per counselor role per team per presentation, so every counselor sees the latest
-- one without regenerating it. Safe to run more than once.
CREATE TABLE IF NOT EXISTS camp201_ebr_counselor_scripts (
  id SERIAL PRIMARY KEY,
  presentation_id INTEGER NOT NULL,
  team_id INTEGER NOT NULL,
  counselor_id INTEGER NOT NULL,
  script JSONB NOT NULL,
  generated_by INTEGER,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (presentation_id, team_id, counselor_id)
);
