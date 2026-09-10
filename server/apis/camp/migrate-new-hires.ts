import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateNewHires",
  description: "Creates the camp201_new_hires staging table for CSV uploads",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_new_hires (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        role_title TEXT,
        region TEXT,
        manager_name TEXT,
        manager_email TEXT,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'invited', 'accepted', 'declined')),
        cohort_id INTEGER REFERENCES camp201_cohorts(id),
        camper_id INTEGER REFERENCES camp201_campers(id),
        uploaded_by INTEGER,
        uploaded_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      [],
      { label: "Create new_hires table" }
    );
    return { success: true };
  },
});
