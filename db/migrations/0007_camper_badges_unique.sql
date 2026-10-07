-- cAMP 201 - restore one-badge-per-cAMPer rule (update 3)
-- The unique key on (camper_id, badge_id) was lost in the database move. Badge awards in
-- Close cAMP, check-ins, daily surveys, and award-badge.ts all rely on it for
-- ON CONFLICT (camper_id, badge_id). Verified no duplicate rows exist before adding it.
CREATE UNIQUE INDEX IF NOT EXISTS camp201_camper_badges_camper_badge_key
  ON camp201_camper_badges (camper_id, badge_id);
