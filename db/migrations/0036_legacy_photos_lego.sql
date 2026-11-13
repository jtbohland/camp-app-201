-- Counselor LEGO minifig (transparent PNG data URL), shown on the public counselor card.
ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS lego_url TEXT;

-- Trophy photo for winning teams on the Legacy Wall.
ALTER TABLE camp201_past_teams ADD COLUMN IF NOT EXISTS trophy_photo_url TEXT;

-- cAMP 201 group photos (one tradition photo per cohort), shown in the Past cAMPs carousel.
CREATE TABLE IF NOT EXISTS camp201_group_photos (
  id SERIAL PRIMARY KEY,
  -- Links to the Legacy Wall cohort when it's a past cohort; null for a cohort not archived yet.
  past_cohort_id INTEGER REFERENCES camp201_past_cohorts(id) ON DELETE SET NULL,
  cohort_number INTEGER NOT NULL,
  label TEXT NOT NULL,              -- e.g. "June 2025"
  photo_data TEXT NOT NULL,         -- resized JPEG data URL
  uploaded_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS camp201_group_photos_cohort_idx ON camp201_group_photos (cohort_number);
