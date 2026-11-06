-- cAMP 201 - Manager overhaul phases 4 + 5
--
-- target_key / target_label: a manager note or reaction can point at one activity-timeline item
--   (e.g. 'survey:68' = "Submitted Day 2 survey"). NULL = a general note about the cAMPer.
-- broadcast_id: notes sent with "Message all my cAMPers" share one id (one thread per cAMPer).

ALTER TABLE camp201_manager_comments
  ADD COLUMN IF NOT EXISTS target_key TEXT,
  ADD COLUMN IF NOT EXISTS target_label TEXT,
  ADD COLUMN IF NOT EXISTS broadcast_id TEXT;

CREATE INDEX IF NOT EXISTS idx_manager_comments_target ON camp201_manager_comments (camper_id, target_key);
