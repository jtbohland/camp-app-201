-- Add team_points column to track team-level bonus points
ALTER TABLE camp201_teams ADD COLUMN IF NOT EXISTS team_points INTEGER NOT NULL DEFAULT 0;

-- Team points log for auditing team-level awards
CREATE TABLE IF NOT EXISTS camp201_team_points_log (
  id SERIAL PRIMARY KEY,
  team_id INTEGER NOT NULL REFERENCES camp201_teams(id),
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  awarded_by TEXT,
  cohort_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_team_points_log_team ON camp201_team_points_log(team_id);
