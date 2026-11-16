-- Who checked off a pre-work item on a cAMPer's behalf (counselor email). NULL = the cAMPer did it
-- themselves (or it was auto-completed). Shown on the report card timeline.
ALTER TABLE camp201_prework ADD COLUMN IF NOT EXISTS completed_by TEXT;
