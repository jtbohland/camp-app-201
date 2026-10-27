-- Counselor-only notes per uploaded new hire (needs, decline reasons, etc.)
ALTER TABLE camp201_new_hires ADD COLUMN IF NOT EXISTS notes TEXT;
