import { api, z, postgres } from "@superblocksteam/sdk-api";
import { mapToStandardRole } from "../../lib/roles.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "UploadNewHireList",
  description: "Parses CSV new hires, matches titles to the 12 roles, flags unmatched titles",
  integrations: { camp_201_db: postgres(APPS_DB) },
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
    })).max(1000),
    uploaded_by: z.number(),
    cohort_id: z.number(),
  }),
  output: z.object({
    inserted: z.number(),
    skipped: z.number(),
    /** Titles that didn't match one of the 12 roles: a counselor needs to pick one. */
    unmatched: z.array(z.object({ email: z.string(), title: z.string() })),
  }),
  async run(ctx, { csv_rows, uploaded_by, cohort_id }) {
    const db = ctx.integrations.camp_201_db;
    let inserted = 0;
    let skipped = 0;
    const unmatched: { email: string; title: string }[] = [];

    for (const row of csv_rows) {
      const email = row.email?.trim().toLowerCase();
      if (!email) { skipped++; continue; }
      const title = row.role_title?.trim() || null;
      const role = mapToStandardRole(title);
      const needsReview = !!title && !role;
      if (needsReview) unmatched.push({ email, title: title! });

      try {
        await db.execute(
          `INSERT INTO camp201_new_hires (first_name, last_name, email, role_title, original_title, role_needs_review,
                                          region, manager_name, manager_email, uploaded_by, cohort_id, status)
           VALUES ($1, $2, $3, $4, $5, $6, camp201_map_region($7, $12), $8, $9, $10, $11, 'invited')
           ON CONFLICT (email) DO UPDATE SET
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             role_title = EXCLUDED.role_title,
             original_title = EXCLUDED.original_title,
             role_needs_review = EXCLUDED.role_needs_review,
             region = EXCLUDED.region,
             manager_name = EXCLUDED.manager_name,
             manager_email = EXCLUDED.manager_email,
             updated_at = NOW()`,
          [row.first_name.trim(), row.last_name.trim(), email,
           // Unmatched titles stay visible so the counselor can see what to fix.
           role ?? title, title, needsReview,
           row.region?.trim() || null,
           row.manager_name?.trim() || null, row.manager_email?.trim() || null,
           uploaded_by, cohort_id, row.country?.trim() || null],
          { label: `Upsert hire: ${email}` }
        );

        // Keep a registered cAMPer's CSV role, country, region, start date and manager in step.
        // The CSV manager is the source of truth.
        await db.execute(
          `UPDATE camp201_campers SET
             country = COALESCE(camp201_map_country($2), country),
             start_date = COALESCE($3::date, start_date),
             csv_role = COALESCE($4, csv_role),
             region = COALESCE(camp201_map_region($5, COALESCE($2, country)), region),
             manager = COALESCE($6, manager),
             manager_email = COALESCE(NULLIF(btrim(manager_email), ''), $7)
           WHERE LOWER(email) = $1 AND role NOT IN ('counselor', 'admin')`,
          [email, row.country?.trim() || null, row.start_date?.trim() || null, role,
           row.region?.trim() || null, row.manager_name?.trim() || null,
           row.manager_email?.trim().toLowerCase() || null],
          { label: `Update camper CSV details: ${email}` }
        );
        inserted++;
      } catch {
        skipped++;
      }
    }

    return { inserted, skipped, unmatched };
  },
});
