-- Add teams_finished counter to check-in sessions for 1st/2nd/3rd team race tracking
ALTER TABLE camp201_checkin_sessions ADD COLUMN IF NOT EXISTS teams_finished INTEGER DEFAULT 0;
