import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getCounselorAccess } from "../../lib/cohort.js";
import { isCampClosed } from "../../lib/camp-closed-guard.js";
import { BlackoutSessionSchema, loadBlackoutWindows, overlappingBlackouts } from "../../lib/blackouts.js";
import { syncCheckinPenalties } from "../../lib/checkin-penalties.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const OwnedAbsenceSchema = z.object({
  id: z.coerce.number(),
  camper_id: z.coerce.number(),
  is_owner: z.boolean(),
  status: z.string(),
  role: z.string().nullable(),
});

/** Loads an absence and checks the signed-in user owns it (or is a counselor). */
async function loadOwnedAbsence(db: any, absenceId: number, email: string) {
  const access = await getCounselorAccess(db, email);
  const rows = await db.query(
    `SELECT a.id, a.camper_id, lower(c.email) = lower($2) AS is_owner, COALESCE(a.status, 'approved') AS status, c.role
     FROM camp201_absence_requests a
     JOIN camp201_campers c ON c.id = a.camper_id
     WHERE a.id = $1 LIMIT 1`,
    OwnedAbsenceSchema,
    [absenceId, email],
    { label: "Load absence" }
  );
  const row = rows[0] as z.infer<typeof OwnedAbsenceSchema> | undefined;
  if (!row) throw new Error("That absence no longer exists. Refresh and try again.");
  if (!row.is_owner && !access.isAdmin) throw new Error("You can only change your own absences.");
  return row;
}

/** cAMPer changes the reason or time of one of their absences. Required sessions are still blocked. */
export const UpdateAbsenceRequest = api({
  name: "UpdateAbsenceRequest",
  description: "Edits the reason or time of an existing absence",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    absence_id: z.number().int(),
    start_time: z.string().min(1),
    end_time: z.string().min(1),
    reason: z.string().trim().min(3).max(500),
  }),
  output: z.object({
    success: z.boolean(),
    error: z.enum(["blackout", "camp_closed"]).nullable(),
    blackout_sessions: z.array(BlackoutSessionSchema),
  }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    const email = ctx.user.email ?? "";
    if (!email) throw new Error("You must be signed in.");

    const start = new Date(input.start_time);
    const end = new Date(input.end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("Enter a valid start and end time.");
    if (end <= start) throw new Error("End time must be after the start time.");
    if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) throw new Error("An absence can be at most 24 hours.");

    if (await isCampClosed(db)) return { success: false, error: "camp_closed" as const, blackout_sessions: [] };

    const row = await loadOwnedAbsence(db, input.absence_id, email);
    if (row.status !== "approved") throw new Error("This absence was removed, so it can't be edited.");

    const { windows } = await loadBlackoutWindows(db);
    const hits = overlappingBlackouts(windows, row.role, start, end);
    if (hits.length > 0) return { success: false, error: "blackout" as const, blackout_sessions: hits };

    await db.execute(
      `UPDATE camp201_absence_requests SET start_time = $2, end_time = $3, reason = $4, blackout_ack_at = NULL WHERE id = $1`,
      [input.absence_id, start.toISOString(), end.toISOString(), input.reason],
      { label: "Update absence" }
    );
    await syncCheckinPenalties(db, row.camper_id);
    return { success: true, error: null, blackout_sessions: [] };
  },
});

/** cAMPer removes an absence they no longer need. It stops counting toward the 3 and the attendance bonus. */
export const WithdrawAbsenceRequest = api({
  name: "WithdrawAbsenceRequest",
  description: "Removes an absence so it no longer counts",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({ absence_id: z.number().int() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { absence_id }) {
    const db = ctx.integrations.camp_201_db;
    const email = ctx.user.email ?? "";
    if (!email) throw new Error("You must be signed in.");
    if (await isCampClosed(db)) throw new Error("cAMP is closed, so absences can't be changed.");

    const row = await loadOwnedAbsence(db, absence_id, email);
    if (row.status !== "approved") return { success: true };

    await db.execute(
      `UPDATE camp201_absence_requests SET status = 'withdrawn', withdrawn_at = NOW(), withdrawn_by = $2 WHERE id = $1`,
      [absence_id, email],
      { label: "Withdraw absence" }
    );
    await syncCheckinPenalties(db, row.camper_id);
    return { success: true };
  },
});
