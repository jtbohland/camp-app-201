-- CSV uploads mean everyone on the list has already been invited.
-- "pending" is retired: new rows default to 'invited', existing pending rows become invited.
ALTER TABLE camp201_new_hires ALTER COLUMN status SET DEFAULT 'invited';
UPDATE camp201_new_hires SET status = 'invited', updated_at = NOW() WHERE status = 'pending';
