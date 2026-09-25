-- cAMP 201 - Remaining tables (part 3)
-- Presentations, prework, hub, exec Q&A, wheel, etc.

-- =============================================================
-- Presentations & rubrics
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_presentations (
  id SERIAL PRIMARY KEY,
  title TEXT,
  description TEXT,
  instructions TEXT,
  resources JSONB DEFAULT '[]',
  prep_time_minutes INTEGER DEFAULT 30,
  present_time_minutes INTEGER DEFAULT 10,
  team_id INTEGER,
  day_number INTEGER,
  status TEXT DEFAULT 'upcoming',
  sort_order INTEGER DEFAULT 0,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  is_locked BOOLEAN DEFAULT true,
  rubric_template_id INTEGER,
  deck_template_url TEXT DEFAULT '',
  questions JSONB DEFAULT '[]',
  presentation_type TEXT DEFAULT 'standard',
  scores_revealed BOOLEAN DEFAULT false,
  session_bank_id INTEGER
);

CREATE TABLE IF NOT EXISTS camp201_rubric_templates (
  id SERIAL PRIMARY KEY,
  name TEXT,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '[]',
  max_total_points INTEGER NOT NULL DEFAULT 100,
  points_to_award INTEGER NOT NULL DEFAULT 10,
  cohort_id INTEGER,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_rubric_scores (
  id SERIAL PRIMARY KEY,
  template_id INTEGER,
  team_id INTEGER,
  scored_by INTEGER,
  scores JSONB NOT NULL DEFAULT '{}',
  total_score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 100,
  notes TEXT,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  cohort_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  presentation_id INTEGER
);

CREATE TABLE IF NOT EXISTS camp201_presentation_feedback (
  id SERIAL PRIMARY KEY,
  presentation_id INTEGER,
  submitted_by INTEGER,
  rating INTEGER,
  strengths TEXT,
  improvements TEXT,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (presentation_id, submitted_by)
);

CREATE TABLE IF NOT EXISTS camp201_presentation_responses (
  id SERIAL PRIMARY KEY,
  presentation_id INTEGER,
  camper_id INTEGER,
  responses JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (presentation_id, camper_id)
);

CREATE TABLE IF NOT EXISTS camp201_presentation_scores (
  id SERIAL PRIMARY KEY,
  presentation_id INTEGER,
  criterion TEXT,
  max_points INTEGER NOT NULL DEFAULT 10,
  score INTEGER,
  notes TEXT,
  scored_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_team_decks (
  id SERIAL PRIMARY KEY,
  presentation_id INTEGER,
  team_id INTEGER,
  deck_url TEXT NOT NULL DEFAULT '',
  deck_name TEXT NOT NULL DEFAULT '',
  uploaded_by INTEGER,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (presentation_id, team_id)
);

CREATE TABLE IF NOT EXISTS camp201_team_workspace (
  id SERIAL PRIMARY KEY,
  presentation_id INTEGER,
  team_id INTEGER,
  responses JSONB NOT NULL DEFAULT '{}',
  last_edited_by INTEGER,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (presentation_id, team_id)
);

CREATE TABLE IF NOT EXISTS camp201_ebr_role_assignments (
  id SERIAL PRIMARY KEY,
  presentation_id INTEGER,
  team_id INTEGER,
  counselor_id INTEGER,
  company_name TEXT NOT NULL DEFAULT '',
  executive_role TEXT NOT NULL DEFAULT '',
  notes TEXT DEFAULT '',
  assigned_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (presentation_id, team_id, counselor_id)
);

-- =============================================================
-- Prework & journey
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_prework (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  item TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  cohort_id INTEGER,
  UNIQUE (user_id, item)
);

CREATE TABLE IF NOT EXISTS camp201_prework_submissions (
  id SERIAL PRIMARY KEY,
  camper_id INTEGER,
  item_key TEXT,
  submission_data JSONB NOT NULL DEFAULT '{}',
  flagged BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (camper_id, item_key)
);

CREATE TABLE IF NOT EXISTS camp201_completion_attempts (
  id SERIAL PRIMARY KEY,
  camper_id INTEGER,
  content_id INTEGER,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  links_missing INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS camp201_link_clicks (
  id SERIAL PRIMARY KEY,
  camper_id INTEGER,
  content_id INTEGER,
  link_url TEXT,
  clicked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (camper_id, content_id, link_url)
);

CREATE TABLE IF NOT EXISTS camp201_journey (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  step TEXT,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, step)
);

-- =============================================================
-- Hub items
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_hub_items (
  id SERIAL PRIMARY KEY,
  team_id INTEGER,
  author_id INTEGER,
  section TEXT,
  item_type TEXT NOT NULL DEFAULT 'note',
  title TEXT,
  content TEXT,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- =============================================================
-- Exec Q&A
-- =============================================================

CREATE TABLE IF NOT EXISTS camp201_exec_questions (
  id SERIAL PRIMARY KEY,
  executive_id INTEGER,
  submitted_by INTEGER,
  question_text TEXT,
  vote_count INTEGER DEFAULT 0,
  is_asked BOOLEAN DEFAULT false,
  is_locked BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS camp201_exec_votes (
  id SERIAL PRIMARY KEY,
  question_id INTEGER,
  voter_id INTEGER,
  vote INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (question_id, voter_id)
);
