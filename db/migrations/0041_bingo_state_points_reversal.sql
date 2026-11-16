-- Fireside Finder: counselors can end the game (no more guesses) and reveal answers to everyone.
ALTER TABLE camp201_presentations ADD COLUMN IF NOT EXISTS bingo_closed_at TIMESTAMPTZ;
ALTER TABLE camp201_presentations ADD COLUMN IF NOT EXISTS bingo_revealed BOOLEAN NOT NULL DEFAULT false;

-- Point reversals: a counselor cancels a wrong award/deduction with an offsetting entry that points
-- at the original. History is kept, and the total stays equal to the sum of the log.
ALTER TABLE camp201_points_log ADD COLUMN IF NOT EXISTS reverses_id INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS uq_points_log_reverses
  ON camp201_points_log (reverses_id) WHERE reverses_id IS NOT NULL;
