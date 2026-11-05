import { api, z, postgres } from "@superblocksteam/sdk-api";
import { ABSENCE_LIMIT, attendancePoints } from "../../lib/absences.js";
import { cohortIdSql, getCounselorAccess, resolveViewCohort } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const RequestSchema = z.object({
  id: z.coerce.number(),
  camper_id: z.coerce.number(),
  camper_name: z.string(),
  team_name: z.string().nullable(),
  start_time: z.string(),
  end_time: z.string(),
  minutes: z.coerce.number(),
  reason: z.string().nullable(),
  status: z.string(),
  approval_type: z.string(),
  created_at: z.string(),
});

const SummarySchema = z.object({
  camper_id: z.coerce.number(),
  camper_name: z.string(),
  photo_url: z.string().nullable(),
  team_name: z.string().nullable(),
  standard_used: z.coerce.number(),
  penalty_count: z.coerce.number(),
  emergency_count: z.coerce.number(),
  total_minutes: z.coerce.number(),
});

export default api({
  name: "GetAbsenceRequests",
  description: "Lists excused absences with per-cAMPer usage and attendance points",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    /** A cAMPer's own absences. Null = everyone in the viewed cohort (counselors only). */
    camper_id: z.number().nullable(),
  }),
  output: z.object({
    requests: z.array(RequestSchema),
    summaries: z.array(SummarySchema.extend({ attendance_points: z.number() })),
    limit: z.number(),
  }),
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    const access = await getCounselorAccess(db, ctx.user.email);

    if (camper_id === null) {
      if (!access.isAdmin) throw new Error("Counselors only.");
    } else if (!access.isAdmin) {
      // A cAMPer can only see their own absences.
      const own = await db.query(
        `SELECT 1 AS ok FROM camp201_campers WHERE id = $1 AND lower(email) = lower($2) LIMIT 1`,
        z.object({ ok: z.coerce.number() }),
        [camper_id, ctx.user.email ?? ""],
        { label: "Verify own absences" }
      );
      if (!own[0]) throw new Error("You can only see your own absences.");
    }

    const VIEW = cohortIdSql((await resolveViewCohort(db, ctx.user.email)).cohortId);
    const where = camper_id !== null ? `a.camper_id = $1` : `c.cohort_id = ${VIEW}`;
    const params = camper_id !== null ? [camper_id] : undefined;
    const sameCohort = `(a.cohort_id IS NULL OR a.cohort_id = c.cohort_id)`;

    const requests = await db.query(
      `SELECT a.id, a.camper_id, CONCAT(c.first_name, ' ', c.last_name) AS camper_name, t.name AS team_name,
              a.start_time::text AS start_time, a.end_time::text AS end_time,
              GREATEST(0, ROUND(EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 60))::int AS minutes,
              a.reason, a.status, COALESCE(a.approval_type, 'standard') AS approval_type, a.created_at::text AS created_at
       FROM camp201_absence_requests a
       JOIN camp201_campers c ON c.id = a.camper_id
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       WHERE ${where} AND ${sameCohort} AND c.removed_at IS NULL
       ORDER BY a.start_time DESC
       LIMIT 200`,
      RequestSchema,
      params,
      { label: "Get absence requests" }
    );

    const summaries = await db.query(
      `SELECT c.id AS camper_id, CONCAT(c.first_name, ' ', c.last_name) AS camper_name, c.photo_url, t.name AS team_name,
              COUNT(a.id) FILTER (WHERE COALESCE(a.approval_type, 'standard') = 'standard' AND a.status = 'approved') AS standard_used,
              COUNT(a.id) FILTER (WHERE a.approval_type = 'counselor_penalty' AND a.status = 'approved') AS penalty_count,
              COUNT(a.id) FILTER (WHERE a.approval_type = 'counselor_emergency' AND a.status = 'approved') AS emergency_count,
              COALESCE(SUM(GREATEST(0, EXTRACT(EPOCH FROM (a.end_time - a.start_time)) / 60)) FILTER (WHERE a.status = 'approved'), 0)::int AS total_minutes
       FROM camp201_campers c
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       LEFT JOIN camp201_absence_requests a ON a.camper_id = c.id AND ${sameCohort}
       WHERE ${camper_id !== null ? "c.id = $1" : `c.cohort_id = ${VIEW}`}
         AND c.role NOT IN ('counselor', 'admin') AND c.removed_at IS NULL
       GROUP BY c.id, c.first_name, c.last_name, c.photo_url, t.name
       ORDER BY COUNT(a.id) DESC, c.first_name
       LIMIT 200`,
      SummarySchema,
      params,
      { label: "Absence usage per cAMPer" }
    );

    return {
      requests,
      summaries: summaries.map((s) => ({ ...s, attendance_points: attendancePoints(s.standard_used, s.penalty_count) })),
      limit: ABSENCE_LIMIT,
    };
  },
});
