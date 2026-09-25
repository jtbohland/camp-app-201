-- cAMP 201 - Dependent tables (part 2)
-- Tables that reference campers, teams, cohorts, etc.

-- =============================================================
-- Agenda & scheduling
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_agenda (
  id SERIAL PRIMARY KEY,
  session_bank_id INTEGER,
  day_number INTEGER,
  start_time TEXT,
  end_time TEXT,
  title TEXT,
  session_type TEXT NOT NULL DEFAULT 'session',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_agenda_items (
  id SERIAL PRIMARY KEY,
  session_id INTEGER,
  day_number INTEGER,
  start_time TEXT,
  end_time TEXT,
  title TEXT,
  description TEXT,
  item_type TEXT DEFAULT 'session',
  location TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_agenda_resources (
  id SERIAL PRIMARY KEY,
  agenda_item_id INTEGER,
  title TEXT,
  url TEXT,
  resource_type TEXT NOT NULL DEFAULT 'link',
  description TEXT,
  added_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- Announcements
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_announcements (
  id SERIAL PRIMARY KEY,
  title TEXT,
  body TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  pinned BOOLEAN DEFAULT false,
  created_by INTEGER,
  cohort_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- Check-in system
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_checkin_sessions (
  id SERIAL PRIMARY KEY,
  label TEXT,
  duration_minutes INTEGER,
  checkin_window_seconds INTEGER,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  timer_ends_at TIMESTAMPTZ,
  checkin_opens_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active',
  first_team_id INTEGER,
  created_by INTEGER,
  cohort_id INTEGER,
  teams_finished INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS camp201_checkin_responses (
  id SERIAL PRIMARY KEY,
  session_id INTEGER,
  camper_id INTEGER,
  team_id INTEGER,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  timing TEXT,
  word_used TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  UNIQUE (session_id, camper_id)
);

CREATE TABLE IF NOT EXISTS camp201_absence_requests (
  id SERIAL PRIMARY KEY,
  camper_id INTEGER,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================
-- Points & badges
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_points_log (
  id SERIAL PRIMARY KEY,
  camper_id INTEGER,
  points INTEGER,
  reason TEXT,
  awarded_by TEXT,
  created_at TIMESTAMP DEFAULT now(),
  cohort_id INTEGER,
  category TEXT DEFAULT 'general'
);

CREATE TABLE IF NOT EXISTS camp201_points (
  id SERIAL PRIMARY KEY,
  session_id INTEGER,
  team_id INTEGER,
  points INTEGER,
  category TEXT,
  reason TEXT,
  awarded_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_team_points_log (
  id SERIAL PRIMARY KEY,
  team_id INTEGER,
  points INTEGER,
  reason TEXT,
  awarded_by TEXT,
  cohort_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_camper_badges (
  id SERIAL PRIMARY KEY,
  camper_id INTEGER,
  badge_id INTEGER,
  awarded_at TIMESTAMPTZ DEFAULT now(),
  awarded_by INTEGER,
  earn_count INTEGER NOT NULL DEFAULT 1
);

-- =============================================================
-- Surveys
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_surveys (
  id SERIAL PRIMARY KEY,
  title TEXT,
  description TEXT,
  questions JSONB NOT NULL DEFAULT '[]',
  day_number INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN DEFAULT false,
  points_per_completion INTEGER NOT NULL DEFAULT 3,
  team_bonus_points INTEGER NOT NULL DEFAULT 5,
  cohort_id INTEGER,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS camp201_survey_responses (
  id SERIAL PRIMARY KEY,
  survey_id INTEGER,
  camper_id INTEGER,
  answers JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (survey_id, camper_id)
);

CREATE TABLE IF NOT EXISTS camp201_daily_survey_submissions (
  id SERIAL PRIMARY KEY,
  camper_id INTEGER,
  day_number INTEGER,
  cohort_id INTEGER,
  points_awarded INTEGER DEFAULT 0,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (camper_id, day_number, cohort_id)
);

CREATE TABLE IF NOT EXISTS camp201_survey_open_responses (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER,
  question_key TEXT,
  response TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS camp201_survey_overall_ratings (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER,
  aspect_key TEXT,
  rating INTEGER
);

CREATE TABLE IF NOT EXISTS camp201_session_ratings (
  id SERIAL PRIMARY KEY,
  submission_id INTEGER,
  agenda_item_id INTEGER,
  session_title TEXT,
  session_type TEXT NOT NULL DEFAULT 'session',
  rating INTEGER,
  usefulness INTEGER,
  comment TEXT DEFAULT ''
);
