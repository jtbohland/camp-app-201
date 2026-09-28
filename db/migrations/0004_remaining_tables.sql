-- cAMP 201 - Remaining tables (part 4)
-- Wheel, bingo, feedback, galleries, managers, past data, etc.

-- =============================================================
-- Wheel & Deal
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_wheel_rounds (
  id SERIAL PRIMARY KEY,
  pitcher_id INTEGER,
  product_id TEXT,
  product_name TEXT,
  challenge_type TEXT,
  challenge_prompt TEXT,
  completion_score INTEGER NOT NULL DEFAULT 1,
  pitch_time_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scoring',
  self_scores JSONB,
  room_avg_scores JSONB,
  room_vote_count INTEGER DEFAULT 0,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS camp201_wheel_scores (
  id SERIAL PRIMARY KEY,
  round_id INTEGER,
  scorer_id INTEGER,
  is_self_eval BOOLEAN NOT NULL DEFAULT false,
  clarity INTEGER,
  tone INTEGER,
  credibility INTEGER,
  close_score INTEGER,
  completion INTEGER,
  total INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, scorer_id)
);

-- =============================================================
-- Bingo
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_bingo_cards (
  id SERIAL PRIMARY KEY,
  presentation_id INTEGER,
  camper_id INTEGER,
  card JSONB NOT NULL DEFAULT '[]',
  found_squares JSONB NOT NULL DEFAULT '{}',
  last_wrong_guess_camper_id INTEGER,
  score INTEGER NOT NULL DEFAULT 0,
  bingos_claimed JSONB NOT NULL DEFAULT '[]',
  penalty_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (presentation_id, camper_id)
);

CREATE TABLE IF NOT EXISTS camp201_bingo_events (
  id SERIAL PRIMARY KEY,
  presentation_id INTEGER,
  camper_id INTEGER,
  event_type TEXT,
  detail JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- Peer feedback
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_peer_feedback (
  id SERIAL PRIMARY KEY,
  session_label TEXT,
  team_id INTEGER,
  author_id INTEGER,
  category TEXT NOT NULL DEFAULT 'general',
  content TEXT,
  cohort_id INTEGER,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_feedback_windows (
  id SERIAL PRIMARY KEY,
  session_id INTEGER,
  title TEXT,
  description TEXT,
  target_team_id INTEGER,
  is_open BOOLEAN DEFAULT false,
  opened_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_feedback (
  id SERIAL PRIMARY KEY,
  window_id INTEGER,
  from_user_id INTEGER,
  to_team_id INTEGER,
  rating INTEGER,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- Gallery & memories
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_gallery (
  id SERIAL PRIMARY KEY,
  image_url TEXT,
  caption TEXT,
  day_number INTEGER,
  uploaded_by INTEGER,
  cohort_id INTEGER,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_photos (
  id SERIAL PRIMARY KEY,
  session_id INTEGER,
  uploaded_by INTEGER,
  uploader_name TEXT,
  photo_data TEXT,
  caption TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_memories (
  id SERIAL PRIMARY KEY,
  camper_id INTEGER,
  memory_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  image_url TEXT,
  day_number INTEGER,
  cohort_id INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_memory_reactions (
  id SERIAL PRIMARY KEY,
  memory_id INTEGER,
  camper_id INTEGER,
  emoji TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (memory_id, camper_id, emoji)
);

-- =============================================================
-- Resources
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_resources (
  id SERIAL PRIMARY KEY,
  session_id INTEGER,
  category TEXT,
  title TEXT,
  description TEXT,
  url TEXT,
  file_data TEXT,
  file_name TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- Hackathon
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_hackathon_submissions (
  id SERIAL PRIMARY KEY,
  presentation_id INTEGER,
  team_id INTEGER UNIQUE,
  app_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  use_case TEXT NOT NULL DEFAULT '',
  how_it_works TEXT NOT NULL DEFAULT '',
  who_uses_it TEXT NOT NULL DEFAULT '',
  app_link TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_hackathon_votes (
  id SERIAL PRIMARY KEY,
  presentation_id INTEGER,
  voter_camper_id INTEGER,
  voted_for_team_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (presentation_id, voter_camper_id)
);

-- =============================================================
-- Managers
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_managers (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  first_name TEXT,
  last_name TEXT,
  title TEXT NOT NULL DEFAULT '',
  region TEXT DEFAULT '',
  cohort_id INTEGER,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_manager_hires (
  id SERIAL PRIMARY KEY,
  manager_id INTEGER,
  camper_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (manager_id, camper_id)
);

CREATE TABLE IF NOT EXISTS camp201_manager_comments (
  id SERIAL PRIMARY KEY,
  manager_id INTEGER,
  camper_id INTEGER,
  comment_type TEXT NOT NULL DEFAULT 'comment',
  sentiment TEXT NOT NULL DEFAULT 'positive',
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- New hires
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_new_hires (
  id SERIAL PRIMARY KEY,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  role_title TEXT,
  region TEXT,
  manager_name TEXT,
  manager_email TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  cohort_id INTEGER,
  camper_id INTEGER,
  uploaded_by INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- Past cohorts & team history
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_past_teams (
  id SERIAL PRIMARY KEY,
  cohort_id INTEGER,
  team_name TEXT,
  logo_url TEXT,
  points INTEGER,
  points_note TEXT,
  place INTEGER,
  is_winner BOOLEAN DEFAULT false,
  tagline TEXT,
  presentation_company TEXT
);

CREATE TABLE IF NOT EXISTS camp201_past_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER,
  full_name TEXT,
  role TEXT,
  region TEXT
);

CREATE TABLE IF NOT EXISTS camp201_team_history (
  id SERIAL PRIMARY KEY,
  team_name TEXT,
  logo_url TEXT,
  mascot TEXT,
  color_hex TEXT,
  cohort_name TEXT,
  cohort_year INTEGER,
  members_count INTEGER DEFAULT 0,
  final_points INTEGER DEFAULT 0,
  placement INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================================
-- Remaining: votes, users, team members
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_spirit_votes (
  id SERIAL PRIMARY KEY,
  voter_id INTEGER,
  nominee_id INTEGER,
  note TEXT,
  cohort_id INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (voter_id, cohort_id)
);

CREATE TABLE IF NOT EXISTS camp201_team_logo_votes (
  id SERIAL PRIMARY KEY,
  team_id INTEGER,
  user_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS camp201_team_members (
  id SERIAL PRIMARY KEY,
  team_id INTEGER,
  user_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS camp201_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'Camper',
  session_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
