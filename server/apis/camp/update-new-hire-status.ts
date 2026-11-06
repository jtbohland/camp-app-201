import { api, z, postgres } from "@superblocksteam/sdk-api";
import { restoreCamper } from "../../lib/camper-removal.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "UpdateNewHireStatus",
  description: "Updates a new hire's status (invited/accepted/declined). On accept, creates camper record.",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    hire_id: z.number(),
    status: z.enum(["invited", "accepted", "declined"]),
    cohort_id: z.number(),
  }),
  output: z.object({ success: z.boolean(), camper_id: z.coerce.number().nullable() }),
  async run(ctx, { hire_id, status, cohort_id }) {
    const db = ctx.integrations.camp_201_db;

    // Get the hire
    const hires = await db.query(
      `SELECT id, first_name, last_name, email, role_title, region, manager_name, manager_email,
              country, start_date::text AS start_date, camper_id
       FROM camp201_new_hires WHERE id = $1 LIMIT 1`,
      z.object({
        id: z.coerce.number(),
        first_name: z.string(),
        last_name: z.string(),
        email: z.string(),
        role_title: z.string().nullable(),
        region: z.string().nullable(),
        manager_name: z.string().nullable(),
        manager_email: z.string().nullable(),
        country: z.string().nullable(),
        start_date: z.string().nullable(),
        camper_id: z.coerce.number().nullable(),
      }),
      [hire_id],
      { label: "Get hire details" }
    );
    if (hires.length === 0) return { success: false, camper_id: null };

    const hire = hires[0];

    // If accepting, create a camper record (if not already created)
    let camperId = hire.camper_id;
    // The account carries everything on the new-hire list (role, country, region, start date, manager),
    // so nothing shows up blank. The cAMPer still fills in the registration form on first sign-in.
    if (status === "accepted" && !camperId) {
      const result = await db.query(
        `INSERT INTO camp201_campers
           (first_name, last_name, email, role, csv_role, cohort_id, country, region, start_date, manager, manager_email)
         VALUES ($1, $2, $3, COALESCE(camp201_map_role($4), 'camper'), camp201_map_role($4), $5,
                 camp201_map_country($6), camp201_map_region($7, $6), $8::date, $9, NULLIF(lower(btrim($10)), ''))
         ON CONFLICT (email) DO UPDATE SET
           first_name = EXCLUDED.first_name,
           country = COALESCE(NULLIF(btrim(camp201_campers.country), ''), EXCLUDED.country),
           region = COALESCE(NULLIF(btrim(camp201_campers.region), ''), EXCLUDED.region),
           start_date = COALESCE(camp201_campers.start_date, EXCLUDED.start_date),
           manager = COALESCE(NULLIF(btrim(camp201_campers.manager), ''), EXCLUDED.manager),
           manager_email = COALESCE(NULLIF(btrim(camp201_campers.manager_email), ''), EXCLUDED.manager_email)
         RETURNING id`,
        z.object({ id: z.coerce.number() }),
        [hire.first_name, hire.last_name, hire.email, hire.role_title, cohort_id,
         hire.country, hire.region, hire.start_date, hire.manager_name, hire.manager_email],
        { label: "Create camper from accepted hire" }
      );
      camperId = result[0].id;
    }

    // Update status
    await db.execute(
      `UPDATE camp201_new_hires SET status = $2, camper_id = $3, cohort_id = $4, updated_at = NOW() WHERE id = $1`,
      [hire_id, status, camperId, cohort_id],
      { label: "Update hire status" }
    );

    // Marking a removed cAMPer as Accepted again brings them back with their points.
    if (status === "accepted" && camperId) {
      await restoreCamper(db, camperId);
    }

    return { success: true, camper_id: camperId };
  },
});
