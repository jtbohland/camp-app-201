-- cAMP 201 Update 38: retro-fill "last login".
-- last_seen_at only started recording in Update 35, so cAMPers who used the app before then
-- show "Never logged in". Fill it from the latest thing each cAMPer did themselves
-- (check-ins, surveys, pre-work, votes, questions, absences, link clicks, profile saves...).
-- Only moves last_seen_at forward; never overwrites a newer value.
-- Things a counselor can trigger for someone (auto-completed Challenger, manual points) are left out.
-- Each source is skipped if its table or columns don't exist, so this is safe in every environment.

DO $$
DECLARE
  src record;
  parts text[] := ARRAY[]::text[];
BEGIN
  FOR src IN
    SELECT * FROM (VALUES
      ('camp201_checkin_responses',        'camper_id',    'checked_in_at', ''),
      ('camp201_daily_survey_submissions', 'camper_id',    'submitted_at',  ''),
      ('camp201_survey_responses',         'camper_id',    'submitted_at',  ''),
      ('camp201_prework',                  'user_id',      'completed_at',  'AND item <> ''challenger_sales'''),
      ('camp201_prework_submissions',      'camper_id',    'created_at',    'AND COALESCE(submission_data->>''auto_completed'', '''') <> ''true'''),
      ('camp201_journey',                  'user_id',      'completed_at',  ''),
      ('camp201_exec_votes',               'voter_id',     'created_at',    ''),
      ('camp201_exec_questions',           'submitted_by', 'created_at',    ''),
      ('camp201_spirit_votes',             'voter_id',     'created_at',    ''),
      ('camp201_team_logo_votes',          'user_id',      'created_at',    ''),
      ('camp201_memories',                 'camper_id',    'created_at',    ''),
      ('camp201_memory_reactions',         'camper_id',    'created_at',    ''),
      ('camp201_link_clicks',              'camper_id',    'clicked_at',    ''),
      ('camp201_bingo_events',             'camper_id',    'created_at',    ''),
      ('camp201_absence_requests',         'camper_id',    'created_at',    ''),
      ('camp201_completion_attempts',      'camper_id',    'attempted_at',  ''),
      ('camp201_presentation_responses',   'camper_id',    'updated_at',    ''),
      ('camp201_manager_comments',         'camper_id',    'camper_read_at',''),
      ('camp201_points_log',               'camper_id',    'created_at',
         'AND reason IN (''Registration completed'', ''Profile completed'')')
    ) AS t(tbl, id_col, ts_col, extra)
  LOOP
    IF to_regclass('public.' || src.tbl) IS NOT NULL
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = src.tbl AND column_name = src.id_col)
       AND EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = 'public' AND table_name = src.tbl AND column_name = src.ts_col)
    THEN
      parts := parts || format(
        'SELECT %1$I::integer AS camper_id, max(%2$I)::timestamptz AS seen_at FROM %3$I
         WHERE %1$I IS NOT NULL AND %2$I IS NOT NULL AND %2$I::timestamptz <= NOW() %4$s
         GROUP BY %1$I',
        src.id_col, src.ts_col, src.tbl, src.extra);
    END IF;
  END LOOP;

  IF array_length(parts, 1) IS NULL THEN
    RETURN;
  END IF;

  EXECUTE format(
    'UPDATE camp201_campers c
     SET last_seen_at = a.seen_at
     FROM (SELECT camper_id, max(seen_at) AS seen_at FROM (%s) s GROUP BY camper_id) a
     WHERE a.camper_id = c.id
       AND (c.last_seen_at IS NULL OR c.last_seen_at < a.seen_at)',
    array_to_string(parts, ' UNION ALL '));
END $$;
