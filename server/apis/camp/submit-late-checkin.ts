import { api, z, postgres } from "@superblocksteam/sdk-api";
import { isCampClosed } from "../../lib/camp-closed-guard.js";
import { recordTeamFinishIfComplete } from "../../lib/checkin-team-race.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const LATE_POINTS = -2;
const ON_TIME_POINTS = 3;
const GRACE_MS = 60_000;

export default api({
  name: "SubmitLateCheckIn",
  description: "Late check-in: camper missed the window, submits PIN only for -2 pts",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    session_id: z.number(),
    pin: z.string(),
  }),
  output: z.object({
    success: z.boolean(),
    points: z.number(),
    error: z.string().nullable(),
  }),
  async run(ctx, { camper_id, session_id, pin }) {
    if (await isCampClosed(ctx.integrations.camp_201_db)) {
      return { success: false, points: 0, error: "cAMP is closed." };
    }

    // Verify PIN
    const CamperSchema = z.object({ pin: z.string().nullable(), team_id: z.number().nullable() });
    const campers = await ctx.integrations.camp_201_db.query(
      `SELECT pin, team_id FROM camp201_campers WHERE id = $1 LIMIT 1`,
      CamperSchema,
      [camper_id],
      { label: "Verify camper PIN" }
    );

    if (campers.length === 0) {
      return { success: false, points: 0, error: "Camper not found" };
    }
    if (!campers[0].pin || campers[0].pin !== pin) {
      return { success: false, points: 0, error: "Invalid PIN" };
    }

    const teamId = campers[0].team_id;

    // Verify session exists
    const SessionSchema = z.object({ status: z.string(), timer_ends_at: z.string() });
    const sessions = await ctx.integrations.camp_201_db.query(
      `SELECT status, timer_ends_at::text AS timer_ends_at FROM camp201_checkin_sessions WHERE id = $1 LIMIT 1`,
      SessionSchema,
      [session_id],
      { label: "Check session status" }
    );

    if (sessions.length === 0) {
      return { success: false, points: 0, error: "Session not found" };
    }

    // Allow late check-in for both active and closed sessions
    // (active = grace period expired but session not formally closed yet)

    // Check duplicate
    const ExistingSchema = z.object({ id: z.number() });
    const existing = await ctx.integrations.camp_201_db.query(
      `SELECT id FROM camp201_checkin_responses WHERE session_id = $1 AND camper_id = $2 LIMIT 1`,
      ExistingSchema,
      [session_id, camper_id],
      { label: "Check duplicate" }
    );

    if (existing.length > 0) {
      return { success: false, points: 0, error: "Already checked in" };
    }

    // Late is decided by the server clock, never the cAMPer's device: still inside the grace minute = on time.
    const graceEnd = new Date(sessions[0].timer_ends_at).getTime() + GRACE_MS;
    const isLate = Date.now() > graceEnd;
    const timing = isLate ? "late" : "on_time";
    const points = isLate ? LATE_POINTS : ON_TIME_POINTS;

    // Record the check-in first (unique per session + cAMPer), so a double tap can't log points twice.
    const recorded = await ctx.integrations.camp_201_db.query(
      `WITH ins AS (
         INSERT INTO camp201_checkin_responses (session_id, camper_id, team_id, timing, word_used, points_awarded)
         VALUES ($1, $2, $3, $4, 'PIN', $5)
         ON CONFLICT (session_id, camper_id) DO NOTHING
         RETURNING id
       ) SELECT id FROM ins LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [session_id, camper_id, teamId, timing, points],
      { label: "Record check-in" }
    );
    if (recorded.length === 0) {
      return { success: false, points: 0, error: "Already checked in" };
    }

    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason) VALUES ($1, $2, $3)`,
      [camper_id, points, `Check-in: ${timing} (session ${session_id})`],
      { label: isLate ? "Log late penalty" : "Log on-time points" }
    );

    // This check-in can be the one that completes the team, so it always counts for the team race.
    await recordTeamFinishIfComplete(ctx.integrations.camp_201_db, session_id, teamId);

    return { success: true, points, error: null };
  },
});
