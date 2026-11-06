import { z } from "@superblocksteam/sdk-api";
import { getCounselorAccess } from "./cohort.js";

export type ReportViewer = "counselor" | "manager";

/**
 * Who may open a cAMPer's report card / activity timeline:
 *   - any counselor
 *   - the manager who has this cAMPer on their dashboard
 * Identity always comes from the server-verified ctx.user.email.
 */
export async function requireReportAccess(db: any, email: string | null | undefined, camperId: number): Promise<ReportViewer> {
  const e = (email ?? "").trim().toLowerCase();
  if (!e) throw new Error("You must be signed in.");

  const access = await getCounselorAccess(db, e);
  if (access.isAdmin) return "counselor";

  const rows = await db.query(
    `SELECT 1 AS ok
     FROM camp201_manager_hires mh
     JOIN camp201_managers m ON m.id = mh.manager_id
     WHERE lower(m.email) = $1 AND mh.camper_id = $2
     LIMIT 1`,
    z.object({ ok: z.coerce.number() }),
    [e, camperId],
    { label: "Check manager owns this hire" }
  );
  if (rows.length === 0) throw new Error("You can only view report cards for cAMPers on your manager dashboard.");
  return "manager";
}
