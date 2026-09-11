-- Wheel & Deal: rounds table (tracks each pitch round)
CREATE TABLE IF NOT EXISTS camp201_wheel_rounds (
  id SERIAL PRIMARY KEY,
  pitcher_id INTEGER NOT NULL REFERENCES camp201_campers(id),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  challenge_type TEXT NOT NULL,
  challenge_prompt TEXT NOT NULL,
  completion_score INTEGER NOT NULL DEFAULT 1,
  pitch_time_seconds INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'scoring',
  self_scores JSONB,
  room_avg_scores JSONB,
  room_vote_count INTEGER DEFAULT 0,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Wheel & Deal: individual scores from each camper per round
CREATE TABLE IF NOT EXISTS camp201_wheel_scores (
  id SERIAL PRIMARY KEY,
  round_id INTEGER NOT NULL REFERENCES camp201_wheel_rounds(id),
  scorer_id INTEGER NOT NULL REFERENCES camp201_campers(id),
  is_self_eval BOOLEAN NOT NULL DEFAULT FALSE,
  clarity INTEGER NOT NULL,
  tone INTEGER NOT NULL,
  credibility INTEGER NOT NULL,
  close_score INTEGER NOT NULL,
  completion INTEGER NOT NULL,
  total INTEGER NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(round_id, scorer_id)
);
