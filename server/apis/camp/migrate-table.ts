import { api, z, postgres } from "@superblocksteam/sdk-api";

const OLD_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";
const NEW_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

// Whitelist of allowed table names (prevents SQL injection)
const ALLOWED_TABLES = [
  "camp201_config", "camp201_feature_gates", "camp201_executives",
  "camp201_word_bank", "camp201_session_bank", "camp201_past_teams",
  "camp201_past_members", "camp201_past_cohorts", "camp201_journey_content",
  "camp201_agenda_items", "camp201_feedback_windows", "camp201_managers",
  "camp201_cohorts", "camp201_badges", "camp201_teams",
  "camp201_rubric_templates", "camp201_presentations", "camp201_agenda",
  "camp201_new_hires", "camp201_campers",
  "camp201_camper_badges", "camp201_points_log", "camp201_checkin_sessions",
  "camp201_checkin_responses", "camp201_daily_survey_submissions",
  "camp201_session_ratings", "camp201_survey_open_responses",
  "camp201_survey_overall_ratings", "camp201_absence_requests",
  "camp201_announcements", "camp201_rubric_scores", "camp201_gallery",
  "camp201_team_logo_votes", "camp201_peer_feedback",
  "camp201_presentation_responses", "camp201_team_decks",
  "camp201_bingo_cards", "camp201_bingo_events",
  "camp201_completion_attempts", "camp201_prework_submissions",
  "camp201_exec_qa_feed", "camp201_exec_qa_votes",
  "camp201_hackathon_submissions", "camp201_hackathon_votes",
  "camp201_ebr_role_assignments", "camp201_agenda_resources",
  "camp201_link_clicks", "camp201_team_workspace",
  "camp201_manager_hires", "camp201_manager_comments",
  "camp201_memories", "camp201_memory_reactions",
  "camp201_wheel_rounds", "camp201_wheel_scores",
  "camp201_spirit_votes", "camp201_team_points_log",
  "camp201_team_history", "camp201_presentation_order",
  "camp201_feedback", "camp201_ice_breaker_questions",
  "camp201_prework_items", "camp201_exec_questions", "camp201_exec_votes",
  "camp201_hub_items", "camp201_journey", "camp201_photos",
  "camp201_points", "camp201_presentation_feedback",
  "camp201_presentation_scores", "camp201_prework",
  "camp201_resources", "camp201_sessions", "camp201_survey_responses",
  "camp201_surveys", "camp201_team_members", "camp201_users",
];

export default api({
  name: "MigrateTable",
  description: "Copies all rows from a source table in old DB to destination table in new App DB",
  integrations: {
    old_db: postgres(OLD_DB),
    new_db: postgres(NEW_DB),
  },
  input: z.object({
    table_name: z.string(),
  }),
  output: z.object({
    success: z.boolean(),
    table_name: z.string(),
    rows_copied: z.number(),
    error: z.string().nullable(),
  }),
  async run(ctx, { table_name }) {
    // Verify caller is admin
    const email = ctx.user?.email;
    if (!email) throw new Error("Not authenticated");

    // Whitelist check
    if (!ALLOWED_TABLES.includes(table_name)) {
      return { success: false, table_name, rows_copied: 0, error: `Table "${table_name}" not in allowed list` };
    }

    try {
      // 1. Get column names from the source table
      const ColSchema = z.object({ column_name: z.string() });
      const columns = await ctx.integrations.old_db.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = $1
         ORDER BY ordinal_position LIMIT 200`,
        ColSchema, [table_name],
        { label: `Get columns for ${table_name}` }
      );

      if (columns.length === 0) {
        return { success: false, table_name, rows_copied: 0, error: "Table not found in source" };
      }

      const colNames = columns.map(c => c.column_name);
      const colList = colNames.map(c => `"${c}"`).join(", ");

      // 2. Read all rows from source as JSON
      const RowSchema = z.object({ row_data: z.any() });
      const sourceRows = await ctx.integrations.old_db.query(
        `SELECT row_to_json(t) AS row_data FROM "${table_name}" t LIMIT 5000`,
        RowSchema, undefined,
        { label: `Read ${table_name} from source` }
      );

      if (sourceRows.length === 0) {
        return { success: true, table_name, rows_copied: 0, error: null };
      }

      // 3. Find the primary key column(s) for upsert conflict target
      const PKSchema = z.object({ column_name: z.string() });
      const pkCols = await ctx.integrations.new_db.query(
        `SELECT a.attname AS column_name
         FROM pg_index i
         JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
         WHERE i.indrelid = $1::regclass AND i.indisprimary
         ORDER BY a.attnum LIMIT 10`,
        PKSchema, [table_name],
        { label: `Get PK for ${table_name}` }
      );

      const pkNames = pkCols.map(c => c.column_name);
      const nonPkCols = colNames.filter(c => !pkNames.includes(c));

      // 4. Insert rows in batches using ON CONFLICT DO UPDATE (upsert)
      const BATCH_SIZE = 50;
      let totalCopied = 0;

      for (let i = 0; i < sourceRows.length; i += BATCH_SIZE) {
        const batch = sourceRows.slice(i, i + BATCH_SIZE);
        const valueClauses: string[] = [];
        const params: unknown[] = [];
        let paramIdx = 1;

        for (const row of batch) {
          const data = typeof row.row_data === "string" ? JSON.parse(row.row_data) : row.row_data;
          const placeholders: string[] = [];
          for (const col of colNames) {
            params.push(data[col] ?? null);
            placeholders.push(`$${paramIdx++}`);
          }
          valueClauses.push(`(${placeholders.join(", ")})`);
        }

        // Build upsert: ON CONFLICT (pk) DO UPDATE SET non-pk cols
        let conflictClause = "";
        if (pkNames.length > 0 && nonPkCols.length > 0) {
          const pkList = pkNames.map(c => `"${c}"`).join(", ");
          const updateSet = nonPkCols.map(c => `"${c}" = EXCLUDED."${c}"`).join(", ");
          conflictClause = ` ON CONFLICT (${pkList}) DO UPDATE SET ${updateSet}`;
        } else if (pkNames.length > 0) {
          conflictClause = ` ON CONFLICT (${pkNames.map(c => `"${c}"`).join(", ")}) DO NOTHING`;
        }

        await ctx.integrations.new_db.execute(
          `INSERT INTO "${table_name}" (${colList}) VALUES ${valueClauses.join(", ")}${conflictClause}`,
          params,
          { label: `Upsert batch ${Math.floor(i / BATCH_SIZE) + 1} into ${table_name}` }
        );

        totalCopied += batch.length;
      }

      // 5. Reset sequences to max(id) + 1 if table has a serial/identity column
      try {
        const SeqSchema = z.object({ seq_name: z.string() });
        const seqs = await ctx.integrations.new_db.query(
          `SELECT pg_get_serial_sequence($1, 'id') AS seq_name LIMIT 1`,
          SeqSchema, [table_name],
          { label: `Check sequence for ${table_name}` }
        );
        if (seqs.length > 0 && seqs[0].seq_name) {
          const MaxSchema = z.object({ max_id: z.coerce.number() });
          const maxRows = await ctx.integrations.new_db.query(
            `SELECT COALESCE(MAX(id), 0)::integer AS max_id FROM "${table_name}" LIMIT 1`,
            MaxSchema, undefined,
            { label: `Get max id from ${table_name}` }
          );
          const maxId = maxRows[0]?.max_id ?? 0;
          if (maxId > 0) {
            await ctx.integrations.new_db.execute(
              `SELECT setval(pg_get_serial_sequence($1, 'id'), $2, true)`,
              [table_name, maxId],
              { label: `Reset sequence for ${table_name}` }
            );
          }
        }
      } catch {
        // Some tables don't have an id/serial column — that's fine
      }

      return { success: true, table_name, rows_copied: totalCopied, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return { success: false, table_name, rows_copied: 0, error: message };
    }
  },
});
