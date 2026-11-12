-- cAMP 201 Update 37: blackout (required) sessions.
-- Counselors mark sessions as required for some or all roles. cAMPers can't request an
-- excused absence that overlaps one, and existing approved absences that overlap get flagged.

-- blackout_roles: standard roles the blackout applies to. Empty = every role.
ALTER TABLE camp201_session_bank ADD COLUMN IF NOT EXISTS is_blackout BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE camp201_session_bank ADD COLUMN IF NOT EXISTS blackout_roles JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE camp201_agenda ADD COLUMN IF NOT EXISTS is_blackout BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE camp201_agenda ADD COLUMN IF NOT EXISTS blackout_roles JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Flagged absences: the cAMPer either withdraws it (status = 'withdrawn', the slot comes back)
-- or acknowledges it and talks to a counselor.
ALTER TABLE camp201_absence_requests ADD COLUMN IF NOT EXISTS blackout_ack_at TIMESTAMPTZ;
ALTER TABLE camp201_absence_requests ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMPTZ;
ALTER TABLE camp201_absence_requests ADD COLUMN IF NOT EXISTS withdrawn_by TEXT;
