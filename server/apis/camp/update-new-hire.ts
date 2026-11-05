import { api, z, postgres } from "@superblocksteam/sdk-api";
import { isStandardRole } from "../../lib/roles.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const optionalText = z.string().nullable();

export default api({
  name: "UpdateNewHire",
  description: "Edits an uploaded new hire's details and counselor notes",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    hire_id: z.number(),
    first_name: z.string(),
    last_name: z.string(),
    email: z.string(),
    role_title: optionalText,
    region: optionalText,
    manager_name: optionalText,
    manager_email: optionalText,
    notes: optionalText,
  }),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    const clean = (v: string | null) => (v && v.trim() ? v.trim() : null);

    const firstName = input.first_name.trim();
    const lastName = input.last_name.trim();
    const email = input.email.trim().toLowerCase();
    const managerEmail = clean(input.manager_email)?.toLowerCase() ?? null;

    if (!firstName || !lastName) {
      return { success: false, message: "First and last name are required." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, message: "Please enter a valid email address." };
    }
    if (managerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(managerEmail)) {
      return { success: false, message: "Please enter a valid manager email." };
    }
    const role = clean(input.role_title);
    if (role && !isStandardRole(role)) {
      return { success: false, message: "Please pick one of the 12 standard roles." };
    }

    const existing = await db.query(
      `SELECT id, camper_id FROM camp201_new_hires WHERE id = $1 LIMIT 1`,
      z.object({ id: z.coerce.number(), camper_id: z.coerce.number().nullable() }),
      [input.hire_id],
      { label: "Get hire" }
    );
    if (existing.length === 0) {
      return { success: false, message: "This new hire no longer exists." };
    }
    const camperId = existing[0].camper_id;

    // Email must stay unique across uploaded new hires.
    const dupHire = await db.query(
      `SELECT id FROM camp201_new_hires WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [email, input.hire_id],
      { label: "Check duplicate hire email" }
    );
    if (dupHire.length > 0) {
      return { success: false, message: "Another new hire already uses that email." };
    }

    // If already linked to a cAMPer account, that email must be free there too.
    if (camperId) {
      const dupCamper = await db.query(
        `SELECT id FROM camp201_campers WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1`,
        z.object({ id: z.coerce.number() }),
        [email, camperId],
        { label: "Check duplicate camper email" }
      );
      if (dupCamper.length > 0) {
        return { success: false, message: "A cAMPer account already uses that email." };
      }
    }

    await db.execute(
      `UPDATE camp201_new_hires SET
         first_name = $2, last_name = $3, email = $4, role_title = $5,
         role_needs_review = CASE WHEN $5::text IS NULL THEN role_needs_review ELSE false END,
         region = $6, manager_name = $7, manager_email = $8, notes = $9, updated_at = NOW()
       WHERE id = $1`,
      [input.hire_id, firstName, lastName, email, role,
       clean(input.region), clean(input.manager_name), managerEmail, clean(input.notes)],
      { label: "Update new hire" }
    );

    // Keep the linked cAMPer account's name and email in sync.
    if (camperId) {
      await db.execute(
        `UPDATE camp201_campers SET first_name = $2, last_name = $3, email = $4, updated_at = NOW()
         WHERE id = $1`,
        [camperId, firstName, lastName, email],
        { label: "Sync linked camper" }
      );
    }

    // The counselor's role is the new CSV role. A cAMPer whose own role couldn't be matched
    // takes this role so the review flag clears.
    if (role) {
      await db.execute(
        `UPDATE camp201_campers SET
           csv_role = $2,
           role = CASE WHEN role_needs_review THEN $2 ELSE role END,
           role_needs_review = false
         WHERE lower(email) = $1 AND role NOT IN ('counselor', 'admin')`,
        [email, role],
        { label: "Sync CSV role to camper" }
      );
    }

    return { success: true, message: "Saved." };
  },
});
