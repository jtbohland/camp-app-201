import { api, z, postgres } from "@superblocksteam/sdk-api";
import { ABSENCE_LIMIT, counselorPasswordMatches, getAbsenceCounts } from "../../lib/absences.js";
import { isCampClosed } from "../../lib/camp-closed-guard.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "RequestAbsence",
  description: "Records an excused absence, enforcing the 3-absence limit",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    start_time: z.string().min(1),
    end_time: z.string().min(1),
    reason: z.string().trim().min(3).max(500),
    /**
     * Only for a 4th+ absence: a counselor approves it in person with the counselor password.
     * "penalty" = -1 pt at Close cAMP, "emergency" = no penalty.
     */
    counselor_approval: z
      .object({
        type: z.enum(["penalty", "emergency"]),
        password: z.string().max(200),
      })
      .nullable(),
  }),
  output: z.object({
    success: z.boolean(),
    id: z.number().nullable(),
    /** limit_reached: show the "you've used all 3" modal. bad_password: wrong counselor password. */
    error: z.enum(["limit_reached", "bad_password", "camp_closed"]).nullable(),
    standard_used: z.number(),
    limit: z.number(),
  }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    const start = new Date(input.start_time);
    const end = new Date(input.end_time);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("Enter a valid start and end time.");
    if (end <= start) throw new Error("End time must be after the start time.");
    if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) throw new Error("An absence can be at most 24 hours.");

    // Only the signed-in cAMPer can request their own absence.
    const owner = await db.query(
      `SELECT id, cohort_id FROM camp201_campers WHERE id = $1 AND lower(email) = lower($2) AND removed_at IS NULL LIMIT 1`,
      z.object({ id: z.coerce.number(), cohort_id: z.coerce.number().nullable() }),
      [input.camper_id, ctx.user.email ?? ""],
      { label: "Verify camper" }
    );
    if (!owner[0]) throw new Error("You can only request your own absences.");

    if (await isCampClosed(db)) {
      return { success: false, id: null, error: "camp_closed" as const, standard_used: 0, limit: ABSENCE_LIMIT };
    }

    const counts = await getAbsenceCounts(db, input.camper_id);
    let approvalType = "standard";
    let approvedBy: string | null = null;

    if (counts.standard_used >= ABSENCE_LIMIT) {
      if (!input.counselor_approval) {
        return { success: false, id: null, error: "limit_reached" as const, standard_used: counts.standard_used, limit: ABSENCE_LIMIT };
      }
      if (!(await counselorPasswordMatches(db, input.counselor_approval.password))) {
        return { success: false, id: null, error: "bad_password" as const, standard_used: counts.standard_used, limit: ABSENCE_LIMIT };
      }
      approvalType = input.counselor_approval.type === "emergency" ? "counselor_emergency" : "counselor_penalty";
      approvedBy = "counselor (password)";
    }

    const result = await db.query(
      `INSERT INTO camp201_absence_requests (camper_id, start_time, end_time, reason, status, approval_type, approved_by, cohort_id)
       VALUES ($1, $2, $3, $4, 'approved', $5, $6, $7) RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [input.camper_id, start.toISOString(), end.toISOString(), input.reason, approvalType, approvedBy, owner[0].cohort_id],
      { label: "Create absence" }
    );

    return {
      success: true,
      id: result[0].id,
      error: null,
      standard_used: counts.standard_used + (approvalType === "standard" ? 1 : 0),
      limit: ABSENCE_LIMIT,
    };
  },
});
