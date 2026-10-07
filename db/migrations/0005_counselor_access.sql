-- cAMP 201 - Counselor access (update 2)
-- Server-side counselor verification, admin list, and Past cAMPs lock.

-- Admins verified via the "cAMP Counselor" tile on the landing page.
CREATE TABLE IF NOT EXISTS camp201_admins (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  verified_at TIMESTAMPTZ DEFAULT now()
);

-- Program lead is always an admin.
INSERT INTO camp201_admins (email, name)
VALUES ('jt.bohland@amplitude.com', 'JT Bohland')
ON CONFLICT (email) DO NOTHING;

-- Server-only settings. No API returns rows from this table.
CREATE TABLE IF NOT EXISTS camp201_app_secrets (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Counselor password, stored as a SHA-256 hash and compared in SQL.
INSERT INTO camp201_app_secrets (key, value)
VALUES ('counselor_password_sha256', encode(sha256(convert_to('NewAchievement201', 'UTF8')), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- New lock for the Past cAMPs tab on Teams & Rankings.
INSERT INTO camp201_feature_gates (feature_key, label, is_locked)
VALUES ('past_camps', 'Past cAMPs', true)
ON CONFLICT (feature_key) DO NOTHING;
