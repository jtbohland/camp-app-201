-- cAMP 201 Update 35: last login tracking + optional dietary considerations.

-- When the cAMPer last opened the app (bumped at most every 5 minutes by GetCurrentCamper).
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- Optional, not part of pre-work or profile completion.
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS dietary_options JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS dietary_notes TEXT;
