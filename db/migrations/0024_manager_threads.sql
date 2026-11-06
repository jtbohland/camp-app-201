-- cAMP 201 - Manager <-> cAMPer <-> counselor conversations (update 28)
--
-- Every manager note/reaction becomes a thread with an audience:
--   'camper'    -> the cAMPer sees it and can reply or acknowledge (counselors can see it too)
--   'counselor' -> private to the manager and counselors; the cAMPer never sees it
-- Read timestamps drive the unread badges for each party.

ALTER TABLE camp201_manager_comments
  ADD COLUMN IF NOT EXISTS visibility TEXT NOT NULL DEFAULT 'counselor',
  ADD COLUMN IF NOT EXISTS camper_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS manager_read_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS counselor_read_at TIMESTAMPTZ;

-- Notes written before this change said "Visible to you and cAMP counselors/admins":
-- keep them counselors-only (the column default above) and don't flag them as unread.
UPDATE camp201_manager_comments
SET counselor_read_at = COALESCE(counselor_read_at, now()),
    manager_read_at = COALESCE(manager_read_at, created_at)
WHERE counselor_read_at IS NULL OR manager_read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_manager_comments_camper ON camp201_manager_comments (camper_id);
CREATE INDEX IF NOT EXISTS idx_manager_comments_manager ON camp201_manager_comments (manager_id);

CREATE TABLE IF NOT EXISTS camp201_manager_comment_replies (
  id SERIAL PRIMARY KEY,
  comment_id INTEGER NOT NULL REFERENCES camp201_manager_comments(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('camper', 'manager', 'counselor')),
  author_email TEXT NOT NULL DEFAULT '',
  author_name TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manager_comment_replies_comment ON camp201_manager_comment_replies (comment_id);
