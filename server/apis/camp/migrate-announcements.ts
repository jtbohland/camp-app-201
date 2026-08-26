import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateAnnouncements",
  description: "Creates the announcements table for counselor broadcasts",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_announcements (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        priority TEXT NOT NULL DEFAULT 'normal',
        pinned BOOLEAN DEFAULT FALSE,
        created_by INTEGER REFERENCES camp201_campers(id),
        cohort_id INTEGER REFERENCES camp201_cohorts(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create announcements table" }
    );

    return { success: true, message: "Announcements table created." };
  },
});
