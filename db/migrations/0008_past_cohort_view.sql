-- cAMP 201 - app-wide past-cohort view for counselors
-- Which cohort each counselor is looking at. NULL cohort_id = the active cohort.
-- One row per counselor email; the server only honors it for verified counselors.
CREATE TABLE IF NOT EXISTS camp201_counselor_view (
  email TEXT PRIMARY KEY,
  cohort_id INTEGER REFERENCES camp201_cohorts(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Final state of a cohort, saved once when it closes (or when the next cohort starts).
-- Holds data that is otherwise reset or keeps changing: leaderboards and points as of close,
-- cAMP-V-P / cAMP Champ, podium, counselors, Wheel & Deal standings, section locks.
CREATE TABLE IF NOT EXISTS camp201_cohort_snapshots (
  cohort_id INTEGER PRIMARY KEY REFERENCES camp201_cohorts(id),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
