-- Update 71: team sessions answer their questions in ONE shared team workspace.
-- Before this, "team presentation" sessions with questions (e.g. Discovering Value Drivers with Mapping)
-- saved each person's answers privately, so teammates couldn't see them.
-- Copy those private answers into each team's shared workspace:
--   * per question, the most recently saved non-empty answer from anyone on the team is used;
--   * anything the team already saved in its shared workspace is kept (never overwritten);
--   * who saved it and when are carried over so the "saved by" label is correct.
-- Private rows are left untouched. Safe to re-run.

WITH src AS (
  SELECT DISTINCT ON (r.presentation_id, c.team_id, kv.key)
         r.presentation_id, c.team_id, kv.key, kv.value, r.camper_id,
         COALESCE(r.updated_at, NOW()) AS saved_at
  FROM camp201_presentation_responses r
  JOIN camp201_presentations p
    ON p.id = r.presentation_id
   AND p.presentation_type IN ('team_presentation', 'team_workshop')
  JOIN camp201_campers c ON c.id = r.camper_id AND c.team_id IS NOT NULL
  CROSS JOIN LATERAL jsonb_each_text(COALESCE(r.responses, '{}'::jsonb)) kv
  WHERE kv.key ~ '^s[0-9]{1,3}_q[0-9]{1,3}$'
    AND btrim(kv.value) <> ''
  ORDER BY r.presentation_id, c.team_id, kv.key, r.updated_at DESC NULLS LAST, r.id DESC
),
agg AS (
  SELECT presentation_id, team_id,
         jsonb_object_agg(key, value) AS responses,
         jsonb_object_agg(
           key,
           jsonb_build_object(
             'by', camper_id,
             'at', to_char(saved_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
           )
         ) AS meta,
         (array_agg(camper_id ORDER BY saved_at DESC))[1] AS last_by
  FROM src
  GROUP BY presentation_id, team_id
)
INSERT INTO camp201_team_workspace (presentation_id, team_id, responses, answer_meta, last_edited_by, updated_at)
SELECT presentation_id, team_id, responses, meta, last_by, NOW()
FROM agg
ON CONFLICT (presentation_id, team_id) DO UPDATE SET
  -- The team's own non-empty shared answers win over copied private ones.
  responses = EXCLUDED.responses || COALESCE((
    SELECT jsonb_object_agg(e.key, e.value)
    FROM jsonb_each(COALESCE(camp201_team_workspace.responses, '{}'::jsonb)) e
    WHERE btrim(e.value #>> '{}') <> ''
  ), '{}'::jsonb),
  answer_meta = EXCLUDED.answer_meta || COALESCE((
    SELECT jsonb_object_agg(m.key, m.value)
    FROM jsonb_each(COALESCE(camp201_team_workspace.answer_meta, '{}'::jsonb)) m
    WHERE EXISTS (
      SELECT 1 FROM jsonb_each(COALESCE(camp201_team_workspace.responses, '{}'::jsonb)) e
      WHERE e.key = m.key AND btrim(e.value #>> '{}') <> ''
    )
  ), '{}'::jsonb),
  updated_at = NOW();
