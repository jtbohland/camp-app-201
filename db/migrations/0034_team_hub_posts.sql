-- Team Hub posts: pin, to-dos (done + assignee), and real links.
-- Posts whose section no longer matches a scheduled presentation (legacy keys like 'notes',
-- or a presentation moved back to the bank) show on the Team Board tab — no data move needed.

ALTER TABLE camp201_hub_items
  ADD COLUMN IF NOT EXISTS is_pinned   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_done     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS assignee_id integer,
  ADD COLUMN IF NOT EXISTS link_url    text;

CREATE INDEX IF NOT EXISTS camp201_hub_items_team_section_idx
  ON camp201_hub_items (team_id, section);
