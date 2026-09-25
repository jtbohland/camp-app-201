-- cAMP 201 App Database - Full schema migration
-- Migrated from shared Apps Database

-- =============================================================
-- Core tables (no FK dependencies)
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_sessions (
  id SERIAL PRIMARY KEY,
  name TEXT,
  start_date DATE,
  end_date DATE,
  num_days INTEGER DEFAULT 5,
  office_address TEXT,
  badge_info TEXT,
  ramp_info TEXT,
  navan_info TEXT,
  office_map_url TEXT,
  hotel_suggestions TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_config (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE,
  value TEXT,
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_cohorts (
  id SERIAL PRIMARY KEY,
  name TEXT,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT false,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_session_bank (
  id SERIAL PRIMARY KEY,
  title TEXT,
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  session_type TEXT NOT NULL DEFAULT 'session',
  created_by TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_word_bank (
  id SERIAL PRIMARY KEY,
  word TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS camp201_executives (
  id SERIAL PRIMARY KEY,
  name TEXT,
  title TEXT,
  photo_url TEXT,
  bio TEXT,
  linkedin_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_feature_gates (
  id SERIAL PRIMARY KEY,
  feature_key TEXT UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  is_locked BOOLEAN NOT NULL DEFAULT true,
  unlock_at TIMESTAMPTZ,
  updated_by TEXT DEFAULT 'system',
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_past_cohorts (
  id SERIAL PRIMARY KEY,
  cohort_number INTEGER UNIQUE,
  date_label TEXT,
  month TEXT,
  year INTEGER,
  num_teams INTEGER NOT NULL DEFAULT 0,
  has_team_names BOOLEAN DEFAULT false,
  has_logos BOOLEAN DEFAULT false,
  has_points BOOLEAN DEFAULT false,
  notes TEXT
);

CREATE TABLE IF NOT EXISTS camp201_journey_content (
  id SERIAL PRIMARY KEY,
  section TEXT,
  tab TEXT,
  sort_order INTEGER DEFAULT 0,
  icon TEXT DEFAULT 'info',
  title TEXT,
  content TEXT,
  tip TEXT,
  links JSONB DEFAULT '[]',
  is_checkable BOOLEAN DEFAULT false,
  item_key TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- Teams table (referenced by many others)
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_teams (
  id SERIAL PRIMARY KEY,
  session_id INTEGER,
  name TEXT,
  logo_data TEXT,
  logo_filename TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  logo_url TEXT,
  color TEXT DEFAULT '#2d6a4f',
  cohort_id INTEGER,
  assigned_company JSONB,
  team_points INTEGER NOT NULL DEFAULT 0
);

-- =============================================================
-- Badges table
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_badges (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'award',
  color TEXT NOT NULL DEFAULT 'amber',
  category TEXT NOT NULL DEFAULT 'general',
  requirement_type TEXT NOT NULL DEFAULT 'manual',
  requirement_value INTEGER DEFAULT 0,
  points_reward INTEGER NOT NULL DEFAULT 0,
  cohort_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  badge_type TEXT NOT NULL DEFAULT 'badge',
  base_points INTEGER NOT NULL DEFAULT 0
);

-- =============================================================
-- Campers table (core, referenced by many FK)
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_campers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'camper',
  manager TEXT,
  region TEXT,
  country TEXT,
  city TEXT,
  start_date DATE,
  photo_url TEXT,
  bio TEXT,
  linkedin_option TEXT DEFAULT 'none',
  linkedin_url TEXT,
  fun_fact TEXT,
  goal_1 TEXT,
  goal_2 TEXT,
  goal_3 TEXT,
  ice_breaker_q1 TEXT,
  ice_breaker_q2 TEXT,
  ice_breaker_q3 TEXT,
  profile_completed BOOLEAN DEFAULT false,
  points INTEGER DEFAULT 0,
  team_id INTEGER,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  goal_1_achieved BOOLEAN DEFAULT false,
  goal_2_achieved BOOLEAN DEFAULT false,
  goal_3_achieved BOOLEAN DEFAULT false,
  pin TEXT,
  cohort_id INTEGER,
  ice_breaker_answers JSONB DEFAULT '{}',
  flight_departure_date TEXT,
  flight_departure_time TEXT,
  leave_office_by TEXT,
  visible_in_cohort BOOLEAN DEFAULT true
);
