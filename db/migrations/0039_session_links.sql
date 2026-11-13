-- Slide decks / links for agenda sessions. Attached to the Session Bank session, so every tile
-- scheduled from it (any day, any cohort) shows the same resources.
CREATE TABLE IF NOT EXISTS camp201_session_links (
  id SERIAL PRIMARY KEY,
  session_bank_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS camp201_session_links_bank_idx ON camp201_session_links (session_bank_id, sort_order);
