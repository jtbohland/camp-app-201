-- 0048: Speaker Q&A points rework.
-- Old rule: escalating points per question (2, then 3, 4 ... with the accelerator), which people
-- were gaming. New rule:
--   * +2 for asking a question while the speaker's session is still live (before it ends).
--   * +1 for every upvote the question gets while the session is live.
--   * Questions asked after the session ends earn nothing (still saved for the speaker).
-- Each question's points are kept in sync from its votes, so they can't drift or double up.

-- ── 1. Point-log entries can point at the Q&A question they're for ─────────────────────
ALTER TABLE camp201_points_log ADD COLUMN IF NOT EXISTS source_question_id INTEGER;
CREATE INDEX IF NOT EXISTS ix_points_log_source_question
  ON camp201_points_log (source_question_id) WHERE source_question_id IS NOT NULL;

-- ── 2. When a speaker's session ends ───────────────────────────────────────────────────
-- cAMP start date + the session's agenda day, at its end time (start time if no end time),
-- Pacific. NULL when it can't be worked out (no start date, or speaker not linked to a
-- session): Q&A then counts as live.
CREATE OR REPLACE FUNCTION camp201_qa_session_end(p_exec INTEGER) RETURNS TIMESTAMPTZ
LANGUAGE plpgsql STABLE AS $fn$
DECLARE
  sd DATE;
  r RECORD;
BEGIN
  SELECT CASE WHEN btrim(value) ~ '^\d{4}-\d{2}-\d{2}' THEN substring(btrim(value), 1, 10)::date END
    INTO sd FROM camp201_config WHERE key = 'camp_start_date' LIMIT 1;
  IF sd IS NULL THEN RETURN NULL; END IF;
  SELECT a.day_number, COALESCE(NULLIF(btrim(a.end_time), ''), NULLIF(btrim(a.start_time), '')) AS t
    INTO r
  FROM camp201_executives e JOIN camp201_agenda a ON a.id = e.agenda_item_id
  WHERE e.id = p_exec;
  IF NOT FOUND OR r.day_number IS NULL OR r.t IS NULL THEN RETURN NULL; END IF;
  BEGIN
    RETURN ((sd + (r.day_number - 1))::timestamp + r.t::time) AT TIME ZONE 'America/Los_Angeles';
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
END;
$fn$;

-- ── 3. Bring one question's points in line with the rules ──────────────────────────────
-- Target = 0 if asked after the session ended, else 2 + upvotes cast before it ended.
-- Writes one entry for the difference (if any). Returns that difference. Safe to repeat.
CREATE OR REPLACE FUNCTION camp201_sync_qa_question_points(p_question INTEGER) RETURNS INTEGER
LANGUAGE plpgsql AS $fn$
DECLARE
  q RECORD;
  ends TIMESTAMPTZ;
  ups INTEGER := 0;
  target INTEGER := 0;
  cur INTEGER;
  had_lines BOOLEAN;
  delta INTEGER;
BEGIN
  -- One sync per question at a time, so two quick votes can't both add the same point.
  PERFORM pg_advisory_xact_lock(hashtext('camp201_qa_question'), p_question);

  SELECT qq.id, qq.executive_id, qq.submitted_by, qq.created_at, c.cohort_id
    INTO q
  FROM camp201_exec_questions qq JOIN camp201_campers c ON c.id = qq.submitted_by
  WHERE qq.id = p_question;
  IF NOT FOUND OR camp201_cohort_frozen(q.cohort_id) THEN RETURN 0; END IF;

  ends := camp201_qa_session_end(q.executive_id);
  IF ends IS NULL OR q.created_at < ends THEN
    SELECT COUNT(*) INTO ups FROM camp201_exec_votes v
    WHERE v.question_id = p_question AND v.vote = 1 AND v.voter_id <> q.submitted_by
      AND (ends IS NULL OR v.created_at < ends);
    target := 2 + ups;
  END IF;

  SELECT COALESCE(SUM(points), 0), COUNT(*) > 0 INTO cur, had_lines
  FROM camp201_points_log WHERE source_question_id = p_question;
  delta := target - cur;
  IF delta = 0 THEN RETURN 0; END IF;

  INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category, source_question_id)
  VALUES (
    q.submitted_by, delta,
    CASE
      WHEN NOT had_lines AND ups > 0 THEN
        'Q&A question asked (+2) and ' || ups || ' upvote' || CASE WHEN ups = 1 THEN '' ELSE 's' END || ' (speaker #' || q.executive_id || ')'
      WHEN NOT had_lines THEN 'Q&A question asked (speaker #' || q.executive_id || ')'
      WHEN delta > 0 THEN 'Upvote on your Q&A question (speaker #' || q.executive_id || ')'
      ELSE 'Upvote removed from your Q&A question (speaker #' || q.executive_id || ')'
    END,
    'system', 'qa', p_question);
  RETURN delta;
END;
$fn$;

-- ── 4. Recalculate the active cohort ───────────────────────────────────────────────────
-- 4a. Cancel every old per-question award (offsetting entry that points at the original).
INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category, reverses_id)
SELECT pl.camper_id, -pl.points, 'Removed: old Q&A question points (Q&A points recalculated)', 'system', 'qa_recalc', pl.id
FROM camp201_points_log pl
JOIN camp201_campers c ON c.id = pl.camper_id
WHERE pl.reason LIKE 'Submitted Q&A question (exec #%'
  AND pl.points <> 0
  AND c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
  AND NOT camp201_cohort_frozen(c.cohort_id)
  AND NOT EXISTS (SELECT 1 FROM camp201_points_log r WHERE r.reverses_id = pl.id)
ON CONFLICT (reverses_id) WHERE reverses_id IS NOT NULL DO NOTHING;

-- 4b. Award every active-cohort question under the new rules.
SELECT camp201_sync_qa_question_points(q.id)
FROM camp201_exec_questions q
JOIN camp201_campers c ON c.id = q.submitted_by
WHERE c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
  AND NOT camp201_cohort_frozen(c.cohort_id)
ORDER BY q.id;
