import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateCohorts",
  description: "Creates cohorts table and adds cohort_id to related tables",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // 1. Create cohorts table
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_cohorts (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES camp201_campers(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create cohorts table" }
    );

    // 2. Add cohort_id to campers
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS cohort_id INTEGER REFERENCES camp201_cohorts(id)`,
      undefined,
      { label: "Add cohort_id to campers" }
    );

    // 3. Add cohort_id to points_log
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_points_log ADD COLUMN IF NOT EXISTS cohort_id INTEGER REFERENCES camp201_cohorts(id)`,
      undefined,
      { label: "Add cohort_id to points_log" }
    );

    // 4. Add cohort_id to checkin_sessions
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_checkin_sessions ADD COLUMN IF NOT EXISTS cohort_id INTEGER REFERENCES camp201_cohorts(id)`,
      undefined,
      { label: "Add cohort_id to checkin_sessions" }
    );

    // 5. Add cohort_id to teams
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_teams ADD COLUMN IF NOT EXISTS cohort_id INTEGER REFERENCES camp201_cohorts(id)`,
      undefined,
      { label: "Add cohort_id to teams" }
    );

    // 6. Add cohort_id to prework
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_prework ADD COLUMN IF NOT EXISTS cohort_id INTEGER REFERENCES camp201_cohorts(id)`,
      undefined,
      { label: "Add cohort_id to prework" }
    );

    // 7. Create a default cohort for existing data
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_cohorts (name, start_date, is_active, created_at)
       VALUES ('Cohort 1 (Legacy)', '2026-08-01', true, NOW())
       ON CONFLICT DO NOTHING`,
      undefined,
      { label: "Seed default cohort" }
    );

    // 8. Assign existing campers to cohort 1
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_campers SET cohort_id = 1 WHERE cohort_id IS NULL`,
      undefined,
      { label: "Assign existing campers to default cohort" }
    );

    // 9. Assign existing points_log to cohort 1
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_points_log SET cohort_id = 1 WHERE cohort_id IS NULL`,
      undefined,
      { label: "Assign existing points_log to default cohort" }
    );

    // 10. Assign existing teams to cohort 1
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_teams SET cohort_id = 1 WHERE cohort_id IS NULL`,
      undefined,
      { label: "Assign existing teams to default cohort" }
    );

    // 11. Assign existing checkin sessions to cohort 1
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_checkin_sessions SET cohort_id = 1 WHERE cohort_id IS NULL`,
      undefined,
      { label: "Assign existing checkin_sessions to default cohort" }
    );

    return { success: true, message: "Cohort system migrated. Default cohort created and existing data assigned." };
  },
});
