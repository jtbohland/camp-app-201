import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateManagers",
  description: "Creates manager tables for the Manager Portal feature",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Manager registration table
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_managers (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        region TEXT DEFAULT '',
        cohort_id INTEGER REFERENCES camp201_cohorts(id),
        last_viewed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create camp201_managers table" }
    );

    // Manager-to-hire link table
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_manager_hires (
        id SERIAL PRIMARY KEY,
        manager_id INTEGER NOT NULL REFERENCES camp201_managers(id),
        camper_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(manager_id, camper_id)
      )`,
      undefined,
      { label: "Create camp201_manager_hires table" }
    );

    // Manager comments/reactions on campers
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_manager_comments (
        id SERIAL PRIMARY KEY,
        manager_id INTEGER NOT NULL REFERENCES camp201_managers(id),
        camper_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        comment_type TEXT NOT NULL DEFAULT 'comment',
        sentiment TEXT NOT NULL DEFAULT 'positive',
        content TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create camp201_manager_comments table" }
    );

    return { success: true, message: "Manager tables created successfully" };
  },
});
