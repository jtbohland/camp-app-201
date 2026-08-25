import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateCheckinTables",
  description: "Creates check-in system tables and adds PIN column to campers",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Add PIN column to campers
    await ctx.integrations.apps_database.execute(
      `ALTER TABLE camp201_campers ADD COLUMN IF NOT EXISTS pin TEXT`,
      undefined,
      { label: "Add PIN column to campers" }
    );

    // Check-in sessions — created by counselor when they start a timer with check-in
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_checkin_sessions (
        id SERIAL PRIMARY KEY,
        label TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        checkin_window_seconds INTEGER NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        timer_ends_at TIMESTAMPTZ NOT NULL,
        checkin_opens_at TIMESTAMPTZ NOT NULL,
        closed_at TIMESTAMPTZ,
        status TEXT NOT NULL DEFAULT 'active',
        first_team_id INTEGER,
        created_by INTEGER REFERENCES camp201_campers(id)
      )`,
      undefined,
      { label: "Create checkin_sessions table" }
    );

    // Check-in responses — individual check-in records
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_checkin_responses (
        id SERIAL PRIMARY KEY,
        session_id INTEGER NOT NULL REFERENCES camp201_checkin_sessions(id),
        camper_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        team_id INTEGER REFERENCES camp201_teams(id),
        checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        timing TEXT NOT NULL,
        word_used TEXT NOT NULL,
        points_awarded INTEGER NOT NULL DEFAULT 0,
        UNIQUE(session_id, camper_id)
      )`,
      undefined,
      { label: "Create checkin_responses table" }
    );

    // Absence requests — camper submits time-off
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_absence_requests (
        id SERIAL PRIMARY KEY,
        camper_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        start_time TIMESTAMPTZ NOT NULL,
        end_time TIMESTAMPTZ NOT NULL,
        reason TEXT,
        status TEXT NOT NULL DEFAULT 'approved',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
      undefined,
      { label: "Create absence_requests table" }
    );

    // Word bank — 1000+ camp/nature words
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_word_bank (
        id SERIAL PRIMARY KEY,
        word TEXT UNIQUE NOT NULL
      )`,
      undefined,
      { label: "Create word_bank table" }
    );

    return { success: true, message: "Check-in tables created, PIN column added" };
  },
});
