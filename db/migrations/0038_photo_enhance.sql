-- Group/trophy photos are auto-enhanced (levels, grain reduction, gentle sharpening) in the browser.
-- Keep the untouched upload so a counselor can always undo the enhancement.
ALTER TABLE camp201_group_photos ADD COLUMN IF NOT EXISTS original_data TEXT;
ALTER TABLE camp201_group_photos ADD COLUMN IF NOT EXISTS enhanced BOOLEAN NOT NULL DEFAULT FALSE;
