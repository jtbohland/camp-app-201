-- Migrate legacy hub section keys → pres_{id}
-- Matches by presentation_type + title to avoid relying on hard-coded IDs
-- (safe to run more than once: WHERE section = 'old_key' won't match already-migrated rows)

UPDATE camp201_hub_items h
SET section = 'pres_' || p.id::text
FROM camp201_presentations p
WHERE h.section = 'pillars'
  AND p.presentation_type = 'team_presentation'
  AND p.title ILIKE '%Value Pillar%'
  AND p.day_number IS NOT NULL;

UPDATE camp201_hub_items h
SET section = 'pres_' || p.id::text
FROM camp201_presentations p
WHERE h.section = 'pov_workshop'
  AND p.presentation_type = 'team_workshop'
  AND p.day_number IS NOT NULL;

UPDATE camp201_hub_items h
SET section = 'pres_' || p.id::text
FROM camp201_presentations p
WHERE h.section = 'hackathon'
  AND p.presentation_type = 'hackathon'
  AND p.day_number IS NOT NULL;

UPDATE camp201_hub_items h
SET section = 'pres_' || p.id::text
FROM camp201_presentations p
WHERE h.section = 'value_mapping'
  AND p.presentation_type = 'team_presentation'
  AND p.day_number = 2
  AND p.title ILIKE '%Value%'
  AND p.title NOT ILIKE '%Pillar%';

UPDATE camp201_hub_items h
SET section = 'pres_' || p.id::text
FROM camp201_presentations p
WHERE h.section = 'ebr'
  AND p.presentation_type = 'team_presentation'
  AND p.title ILIKE '%EBR%';
