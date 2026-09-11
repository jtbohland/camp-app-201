import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UploadNewHireList",
  description: "Parses CSV data and upserts new hires into the staging table",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    csv_rows: z.array(z.object({
      first_name: z.string(),
      last_name: z.string(),
      email: z.string(),
      role_title: z.string().nullable(),
      region: z.string().nullable(),
      country: z.string().nullable(),
      start_date: z.string().nullable(),
      manager_name: z.string().nullable(),
      manager_email: z.string().nullable(),
    })),
    uploaded_by: z.number(),
    cohort_id: z.number(),
  }),
  output: z.object({ inserted: z.number(), skipped: z.number() }),
  async run(ctx, { csv_rows, uploaded_by, cohort_id }) {
    const db = ctx.integrations.apps_database;
    let inserted = 0;
    let skipped = 0;

    for (const row of csv_rows) {
      if (!row.email?.trim()) { skipped++; continue; }
      try {
        await db.execute(
          `INSERT INTO camp201_new_hires (first_name, last_name, email, role_title, region, manager_name, manager_email, uploaded_by, cohort_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (email) DO UPDATE SET
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             role_title = EXCLUDED.role_title,
             region = EXCLUDED.region,
             manager_name = EXCLUDED.manager_name,
             manager_email = EXCLUDED.manager_email,
             updated_at = NOW()`,
          [row.first_name.trim(), row.last_name.trim(), row.email.trim().toLowerCase(),
           row.role_title?.trim() || null, row.region?.trim() || null,
           row.manager_name?.trim() || null, row.manager_email?.trim() || null,
           uploaded_by, cohort_id],
          { label: `Upsert hire: ${row.email}` }
        );
        // Also update camper record with country and start_date if they exist
        if (row.country?.trim() || row.start_date?.trim()) {
          await db.execute(
            `UPDATE camp201_campers SET
               country = COALESCE($2, country),
               start_date = COALESCE($3::date, start_date)
             WHERE LOWER(email) = $1`,
            [row.email.trim().toLowerCase(),
             row.country?.trim() || null,
             row.start_date?.trim() || null],
            { label: `Update camper country/start: ${row.email}` }
          );
        }
        inserted++;
      } catch {
        skipped++;
      }
    }

    return { inserted, skipped };
  },
});
