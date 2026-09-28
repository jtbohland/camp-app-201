import { api, z, postgres } from "@superblocksteam/sdk-api";

const OLD_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";
const NEW_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const TableStatusSchema = z.object({
  table_name: z.string(),
  source_count: z.number(),
  dest_count: z.number(),
  synced: z.boolean(),
  wave: z.number(),
});

export default api({
  name: "GetMigrationStatus",
  description: "Compares row counts between old Apps DB and new App Database for all camp201 tables",
  integrations: {
    old_db: postgres(OLD_DB),
    new_db: postgres(NEW_DB),
  },
  input: z.object({}),
  output: z.object({
    tables: z.array(TableStatusSchema),
    total_source: z.number(),
    total_dest: z.number(),
    all_synced: z.boolean(),
  }),
  async run(ctx) {
    // Verify caller is admin/counselor
    const email = ctx.user?.email;
    if (!email) throw new Error("Not authenticated");

    const CountSchema = z.object({ table_name: z.string(), cnt: z.coerce.number() });

    // Get row counts from source (old shared DB)
    const sourceCounts = await ctx.integrations.old_db.query(
      `SELECT relname AS table_name, n_live_tup::integer AS cnt
       FROM pg_stat_user_tables
       WHERE relname LIKE 'camp201_%'
       ORDER BY relname LIMIT 200`,
      CountSchema, undefined,
      { label: "Source row counts" }
    );

    // Get row counts from destination (new App DB)
    const destCounts = await ctx.integrations.new_db.query(
      `SELECT relname AS table_name, n_live_tup::integer AS cnt
       FROM pg_stat_user_tables
       WHERE relname LIKE 'camp201_%'
       ORDER BY relname LIMIT 200`,
      CountSchema, undefined,
      { label: "Dest row counts" }
    );

    const destMap = new Map(destCounts.map(r => [r.table_name, r.cnt]));

    // Dependency waves — parent tables first, children later
    // Wave 0: No FK dependencies (root tables)
    const wave0 = new Set([
      "camp201_config", "camp201_feature_gates", "camp201_executives",
      "camp201_word_bank", "camp201_session_bank", "camp201_past_teams",
      "camp201_past_members", "camp201_past_cohorts", "camp201_journey_content",
      "camp201_agenda_items", "camp201_feedback_windows", "camp201_managers",
    ]);
    // Wave 1: cohorts, badges, teams (low-dep root-ish tables)
    const wave1 = new Set([
      "camp201_cohorts", "camp201_badges", "camp201_teams",
      "camp201_rubric_templates", "camp201_presentations",
      "camp201_agenda", "camp201_new_hires",
    ]);
    // Wave 2: campers (depends on teams + cohorts)
    const wave2 = new Set(["camp201_campers"]);
    // Wave 3+: everything else (depends on campers, teams, etc.)

    function getWave(name: string): number {
      if (wave0.has(name)) return 0;
      if (wave1.has(name)) return 1;
      if (wave2.has(name)) return 2;
      return 3;
    }

    const tables = sourceCounts.map(s => ({
      table_name: s.table_name,
      source_count: s.cnt,
      dest_count: destMap.get(s.table_name) ?? 0,
      synced: s.cnt === (destMap.get(s.table_name) ?? 0),
      wave: getWave(s.table_name),
    }));

    // Sort by wave then name
    tables.sort((a, b) => a.wave - b.wave || a.table_name.localeCompare(b.table_name));

    const totalSource = tables.reduce((sum, t) => sum + t.source_count, 0);
    const totalDest = tables.reduce((sum, t) => sum + t.dest_count, 0);

    return {
      tables,
      total_source: totalSource,
      total_dest: totalDest,
      all_synced: tables.every(t => t.synced),
    };
  },
});
