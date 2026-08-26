import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateGallery",
  description: "Creates the photo gallery table for shared camp moments",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_gallery (
        id SERIAL PRIMARY KEY,
        image_url TEXT NOT NULL,
        caption TEXT,
        day_number INTEGER,
        uploaded_by INTEGER REFERENCES camp201_campers(id),
        cohort_id INTEGER REFERENCES camp201_cohorts(id),
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create gallery table" }
    );

    return { success: true, message: "Gallery table created." };
  },
});
