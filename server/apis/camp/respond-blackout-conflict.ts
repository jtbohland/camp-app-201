import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getCounselorAccess } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/**
 * A flagged absence (overlaps a required session):
 * - "withdraw": cancels it. It no longer counts toward the 3 excused absences.
 * - "acknowledge": the cAMPer has seen the notice (they keep it and talk to a counselor).
 * cAMPers can act on their own absences; counselors can act on anyone's.
 */
export default api({
  name: "RespondToBlackoutConflict",
  description: "Withdraws or acknowledges an absence that overlaps a blackout",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    absence_id: z.number().int(),
    action: z.enum(["withdraw", "acknowledge"]),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { absence_id, action }) {
    const db = ctx.integrations.camp_db;
    const email = ctx.user.email ?? "";
    const access = await getCounselorAccess(db, email);

    const rows = await db.query(
      `SELECT a.id, lower(c.email) = lower($2) AS is_owner, COALESCE(a.status, 'approved') AS status
       FROM camp201_absence_requests a
       JOIN camp201_campers c ON c.id = a.camper_id
       WHERE a.id = $1 LIMIT 1`,
      z.object({ id: z.coerce.number(), is_owner: z.boolean(), status: z.string() }),
      [absence_id, email],
      { label: "Load absence" }
    );
    const row = rows[0];
    if (!row) throw new Error("That absence no longer exists. Refresh and try again.");
    if (!row.is_owner && !access.isAdmin) throw new Error("You can only change your own absences.");

    if (action === "withdraw") {
      if (row.status !== "approved") return { success: true };
      await db.execute(
        `UPDATE camp201_absence_requests
         SET status = 'withdrawn', withdrawn_at = NOW(), withdrawn_by = $2
         WHERE id = $1`,
        [absence_id, email],
        { label: "Withdraw absence" }
      );
    } else {
      await db.execute(
        `UPDATE camp201_absence_requests SET blackout_ack_at = COALESCE(blackout_ack_at, NOW()) WHERE id = $1`,
        [absence_id],
        { label: "Acknowledge blackout notice" }
      );
    }
    return { success: true };
  },
});
