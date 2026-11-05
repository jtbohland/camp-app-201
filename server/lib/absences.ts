import { z } from "@superblocksteam/sdk-api";

/** Each cAMPer gets this many excused absences per cAMP. */
export const ABSENCE_LIMIT = 3;

/** Close cAMP attendance points: 0 used = +3, 1 = +2, 2 = +1, 3 = 0, then -1 per penalized extra. */
export function attendancePoints(standardUsed: number, penalizedExtras: number): number {
  return Math.max(0, ABSENCE_LIMIT - standardUsed) - penalizedExtras;
}

/** True when an absence uses one of the 3 included excused absences. */
export function countsTowardLimit(approvalType: string | null, status: string | null): boolean {
  return (status ?? "approved") === "approved" && (approvalType ?? "standard") === "standard";
}

type Db = {
  query: <T>(sql: string, schema: z.ZodType<T>, params?: unknown[], meta?: { label?: string }) => Promise<T[]>;
};

const CountsSchema = z.object({
  standard_used: z.coerce.number(),
  penalty_count: z.coerce.number(),
  emergency_count: z.coerce.number(),
});

export type AbsenceCounts = z.infer<typeof CountsSchema>;

/** Absences counted for one cAMPer in their current cohort. */
export async function getAbsenceCounts(db: Db, camperId: number): Promise<AbsenceCounts> {
  const rows = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE COALESCE(a.approval_type, 'standard') = 'standard') AS standard_used,
       COUNT(*) FILTER (WHERE a.approval_type = 'counselor_penalty') AS penalty_count,
       COUNT(*) FILTER (WHERE a.approval_type = 'counselor_emergency') AS emergency_count
     FROM camp201_absence_requests a
     JOIN camp201_campers c ON c.id = a.camper_id
     WHERE a.camper_id = $1
       AND a.status = 'approved'
       AND (a.cohort_id IS NULL OR a.cohort_id = c.cohort_id)`,
    CountsSchema,
    [camperId],
    { label: "Count excused absences" }
  );
  return rows[0] ?? { standard_used: 0, penalty_count: 0, emergency_count: 0 };
}

/** True when the password matches the stored counselor password hash. Checked in SQL only. */
export async function counselorPasswordMatches(db: Db, password: string): Promise<boolean> {
  if (!password) return false;
  const match = await db.query(
    `SELECT 1 AS ok FROM camp201_app_secrets
     WHERE key = 'counselor_password_sha256'
       AND value = encode(sha256(convert_to($1, 'UTF8')), 'hex')
     LIMIT 1`,
    z.object({ ok: z.coerce.number() }),
    [password],
    { label: "Check counselor password" }
  );
  return match.length > 0;
}

/**
 * SQL that counts a team's members excused right now (approved absence covering NOW()).
 * $team is the team id placeholder.
 */
export function excusedNowSql(teamParam: string): string {
  return `(SELECT COUNT(DISTINCT ar.camper_id)
           FROM camp201_absence_requests ar
           JOIN camp201_campers c2 ON c2.id = ar.camper_id
           WHERE c2.team_id = ${teamParam}
             AND c2.role NOT IN ('counselor', 'admin')
             AND c2.removed_at IS NULL
             AND ar.status = 'approved'
             AND ar.start_time <= NOW()
             AND ar.end_time >= NOW())`;
}
