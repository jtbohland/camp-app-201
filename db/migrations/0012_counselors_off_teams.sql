-- cAMP 201 - Counselors don't belong to a team or have a manager on their profile.
-- Clears leftover test values (e.g. team "Summit Seekers", manager "Other")
-- from counselor records so they don't show on Cohort tab bio cards.
UPDATE camp201_campers c
SET team_id = NULL,
    manager = NULL,
    updated_at = now()
WHERE (c.role IN ('counselor', 'admin')
       OR EXISTS (SELECT 1 FROM camp201_admins a WHERE lower(a.email) = lower(c.email)))
  AND (c.team_id IS NOT NULL OR c.manager IS NOT NULL);
