-- Per-answer "saved by / when" for the shared team workspace, so each question can be saved on its own.
ALTER TABLE camp201_team_workspace
  ADD COLUMN IF NOT EXISTS answer_meta JSONB NOT NULL DEFAULT '{}';
