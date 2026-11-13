-- Trophy photos move next to group photos, keyed by cohort number, so counselors can add one
-- for any cohort (including ones not on the Legacy Wall yet). The champion tile picks it up by cohort.
ALTER TABLE camp201_group_photos ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'group';

-- Where the photo is anchored when it's cropped to fit (percent, 0-100). Set by click-and-drag.
ALTER TABLE camp201_group_photos ADD COLUMN IF NOT EXISTS focus_x SMALLINT NOT NULL DEFAULT 50;
ALTER TABLE camp201_group_photos ADD COLUMN IF NOT EXISTS focus_y SMALLINT NOT NULL DEFAULT 40;

-- Carry over the trophy photos already added to champion teams (one per cohort).
INSERT INTO camp201_group_photos (past_cohort_id, cohort_number, label, photo_data, kind)
SELECT DISTINCT ON (pc.cohort_number) pc.id, pc.cohort_number, t.team_name, t.trophy_photo_url, 'trophy'
FROM camp201_past_teams t
JOIN camp201_past_cohorts pc ON pc.id = t.cohort_id
WHERE t.trophy_photo_url IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM camp201_group_photos g WHERE g.kind = 'trophy' AND g.cohort_number = pc.cohort_number
  )
ORDER BY pc.cohort_number, t.is_winner DESC, t.place ASC NULLS LAST;

-- One trophy photo per cohort.
CREATE UNIQUE INDEX IF NOT EXISTS camp201_trophy_photo_cohort_uq
  ON camp201_group_photos (cohort_number) WHERE kind = 'trophy';
