-- Counselors can remove a cAMPer (e.g. they declined the invite) without deleting their data.
-- Removed people drop out of every cohort view; their profile, points, and history are kept
-- so a counselor can restore them later.
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS removed_at TIMESTAMPTZ;
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS removed_by TEXT;
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS removed_from_cohort_id INTEGER;
-- Set when a removed person registers again; they stay hidden until a counselor restores them.
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS rejoin_requested_at TIMESTAMPTZ;
