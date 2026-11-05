import { api, z, postgres } from "@superblocksteam/sdk-api";
import { isStandardRole } from "../../lib/roles.js";
import { assertNotViewingPast, requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default api({
  name: "AddNewHire",
  description: "Counselor manually adds one cAMPer to Cohort Management",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    cohort_id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    /** Exact official title, e.g. "Major Enterprise Account Executive". */
    official_title: z.string(),
    /** Abbreviated cAMP role, one of the standard roles. */
    role: z.string(),
    country: z.string(),
    start_date: z.string(),
    manager_name: z.string(),
    manager_email: z.string(),
  }),
  output: z.object({ success: z.boolean(), message: z.string(), hire_id: z.number().nullable() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);

    const fail = (message: string) => ({ success: false, message, hire_id: null });
    const firstName = input.first_name.trim();
    const lastName = input.last_name.trim();
    const email = input.email.trim().toLowerCase();
    const title = input.official_title.trim();
    const country = input.country.trim();
    const startDate = input.start_date.trim();
    const managerName = input.manager_name.trim();
    const managerEmail = input.manager_email.trim().toLowerCase();

    if (!firstName || !lastName || !title || !country || !startDate || !managerName) {
      return fail("Please fill in every field.");
    }
    if (!EMAIL_RE.test(email)) return fail("Please enter a valid email.");
    if (!EMAIL_RE.test(managerEmail)) return fail("Please enter a valid manager email.");
    if (!isStandardRole(input.role)) return fail("Please pick a cAMP role.");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return fail("Please pick a start date.");

    const dup = await db.query(
      `SELECT first_name, last_name FROM camp201_new_hires WHERE lower(email) = $1 LIMIT 1`,
      z.object({ first_name: z.string().nullable(), last_name: z.string().nullable() }),
      [email],
      { label: "Check duplicate hire email" }
    );
    if (dup.length > 0) {
      const who = [dup[0].first_name, dup[0].last_name].filter(Boolean).join(" ") || email;
      return fail(`${who} is already in Cohort Management. Use Edit to change their details.`);
    }

    const created = await db.query(
      `INSERT INTO camp201_new_hires (first_name, last_name, email, role_title, original_title, role_needs_review,
                                      region, country, start_date, manager_name, manager_email, cohort_id, status)
       VALUES ($1, $2, $3, $4, $5, false, camp201_map_region(NULL, $6), camp201_map_country($6), $7::date,
               $8, $9, $10, 'invited')
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [firstName, lastName, email, input.role, title, country, startDate, managerName, managerEmail, input.cohort_id],
      { label: `Add hire: ${email}` }
    );

    // Same as a CSV upload: if they've already registered, keep their account in step.
    await db.execute(
      `UPDATE camp201_campers SET
         country = COALESCE(camp201_map_country($2), country),
         start_date = COALESCE($3::date, start_date),
         csv_role = $4,
         role = $4,
         role_needs_review = false,
         region = COALESCE(camp201_map_region(NULL, $2), region),
         manager = $5,
         manager_email = COALESCE(NULLIF(btrim(manager_email), ''), $6),
         updated_at = NOW()
       WHERE lower(email) = $1 AND role NOT IN ('counselor', 'admin')`,
      [email, country, startDate, input.role, managerName, managerEmail],
      { label: `Sync camper details: ${email}` }
    );

    return { success: true, message: `Added ${firstName} ${lastName}.`, hire_id: created[0]?.id ?? null };
  },
});
