import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SetupDatabase",
  description: "Creates all cAMP 201 database tables if they don't exist",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Campers table - core registration and profile data
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_campers (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'camper',
        manager TEXT,
        region TEXT,
        country TEXT,
        city TEXT,
        start_date DATE,
        photo_url TEXT,
        bio TEXT,
        linkedin_option TEXT DEFAULT 'none',
        linkedin_url TEXT,
        fun_fact TEXT,
        goal_1 TEXT,
        goal_2 TEXT,
        goal_3 TEXT,
        ice_breaker_q1 TEXT,
        ice_breaker_q2 TEXT,
        ice_breaker_q3 TEXT,
        profile_completed BOOLEAN DEFAULT FALSE,
        points INTEGER DEFAULT 0,
        team_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      undefined,
      { label: "Create camp201_campers table" }
    );

    // Points log - tracks all point awards/deductions
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_points_log (
        id SERIAL PRIMARY KEY,
        camper_id INTEGER NOT NULL,
        points INTEGER NOT NULL,
        reason TEXT NOT NULL,
        awarded_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      undefined,
      { label: "Create camp201_points_log table" }
    );

    // Pre-work completions - tracks which items each camper has completed
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_prework (
        id SERIAL PRIMARY KEY,
        camper_id INTEGER NOT NULL,
        item_key TEXT NOT NULL,
        completed_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(camper_id, item_key)
      )`,
      undefined,
      { label: "Create camp201_prework table" }
    );

    // Session bank - reusable sessions that counselors can drag into the schedule
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_session_bank (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        duration_minutes INTEGER NOT NULL DEFAULT 60,
        session_type TEXT NOT NULL DEFAULT 'session',
        created_by TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      undefined,
      { label: "Create camp201_session_bank table" }
    );

    // Scheduled sessions - sessions placed on the agenda
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_agenda (
        id SERIAL PRIMARY KEY,
        session_bank_id INTEGER REFERENCES camp201_session_bank(id),
        day_number INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        title TEXT NOT NULL,
        session_type TEXT NOT NULL DEFAULT 'session',
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      undefined,
      { label: "Create camp201_agenda table" }
    );

    // Camp configuration (number of days, etc.)
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_config (
        id SERIAL PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      undefined,
      { label: "Create camp201_config table" }
    );

    // Teams
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        logo_url TEXT,
        color TEXT DEFAULT '#2d6a4f',
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      undefined,
      { label: "Create camp201_teams table" }
    );

    // Team hub items (collaborative workspace content)
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_hub_items (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL REFERENCES camp201_teams(id),
        author_id INTEGER NOT NULL,
        section TEXT NOT NULL,
        item_type TEXT NOT NULL DEFAULT 'note',
        title TEXT NOT NULL,
        content TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      undefined,
      { label: "Create camp201_hub_items table" }
    );

    // Executives / speaker bank
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_executives (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        title TEXT NOT NULL,
        photo_url TEXT,
        bio TEXT,
        linkedin_url TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      undefined,
      { label: "Create camp201_executives table" }
    );

    return { success: true, message: "Database tables created successfully" };
  },
});
