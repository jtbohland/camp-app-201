import { z } from "@superblocksteam/sdk-api";

export const PREWORK_PENALTY_POINTS = -3;
export const PREWORK_POINTS = 5;

/**
 * True once the pre-work deadline has passed (Settings value in Pacific time; blank = cAMP start
 * date at 9:00 AM PT). Pre-work and profiles finished after that still count as done, for 0 points.
 */
export async function isPastPreworkDeadline(db: any): Promise<boolean> {
  const rows = await db.query(
    `SELECT (camp201_prework_deadline() IS NOT NULL AND NOW() >= camp201_prework_deadline()) AS past`,
    z.object({ past: z.boolean().nullable() }),
    undefined,
    { label: "Check pre-work deadline" }
  );
  return rows[0]?.past === true;
}

/** The deadline as an ISO timestamp, or null when no deadline or cAMP start date is set. */
export async function getPreworkDeadline(db: any): Promise<string | null> {
  const rows = await db.query(
    `SELECT to_char(camp201_prework_deadline() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS deadline`,
    z.object({ deadline: z.string().nullable() }),
    undefined,
    { label: "Get pre-work deadline" }
  );
  return rows[0]?.deadline ?? null;
}

/**
 * Applies the missed-deadline penalty once the deadline has passed: one deduction per cAMPer whose
 * pre-work wasn't all finished in time. Safe to call often; each cAMPer is only ever charged once.
 */
export async function applyDeadlinePenalty(db: any): Promise<number> {
  const rows = await db.query(
    `SELECT camp201_apply_prework_deadline_penalty() AS n`,
    z.object({ n: z.coerce.number().nullable() }),
    undefined,
    { label: "Apply missed pre-work deadline penalty" }
  );
  return rows[0]?.n ?? 0;
}

/** Awards the early-bird bonus if this cAMPer just finished all pre-work early enough. Returns points. */
export async function tryEarlyBird(db: any, camperId: number): Promise<number> {
  const rows = await db.query(
    `SELECT camp201_award_prework_early_bird($1) AS pts`,
    z.object({ pts: z.coerce.number().nullable() }),
    [camperId],
    { label: "Check early-bird bonus" }
  );
  return rows[0]?.pts ?? 0;
}

type MarkOptions = {
  /** The submission looked off (e.g. Wheel & Deal scores out of range): deduct instead of award. */
  flagged: boolean;
  /** Award the normal pre-work points (false for roles exempt from Challenger). */
  awardPoints: boolean;
};

export type MarkResult = {
  newlyCompleted: boolean;
  pointsAwarded: number;
  penaltyApplied: boolean;
  /** Finished after the deadline: done, but for 0 points. */
  pastDeadline: boolean;
  /** Early-bird bonus earned by finishing the last pre-work task (0 if none). */
  earlyBirdPoints: number;
};

const MarkRow = z.object({
  newly: z.coerce.number(),
  counselor: z.boolean().nullable(),
  past: z.boolean().nullable(),
  pts: z.coerce.number(),
});

/**
 * Marks one pre-work item complete for a cAMPer and awards points, only the first time.
 * Already-complete items are left exactly as they are (no extra points, no changes).
 *
 * The check-off and its point-log entry are written in ONE statement, so an item can never be
 * marked done without its points (or the other way round). Every check-off leaves a log line:
 * +5 on time, -3 for a flagged submission, or 0 "after deadline", so totals are always explainable.
 * The database adds each log entry to the cAMPer's total.
 */
export async function markPreworkComplete(
  db: any,
  userId: number,
  item: string,
  { flagged, awardPoints }: MarkOptions
): Promise<MarkResult> {
  const none: MarkResult = { newlyCompleted: false, pointsAwarded: 0, penaltyApplied: false, pastDeadline: false, earlyBirdPoints: 0 };
  const rows = await db.query(
    `WITH done AS (
       INSERT INTO camp201_prework (user_id, item, completed, completed_at)
       VALUES ($1, $2::text, true, NOW())
       ON CONFLICT (user_id, item) DO UPDATE
         SET completed = true, completed_at = COALESCE(camp201_prework.completed_at, NOW())
         WHERE camp201_prework.completed IS NOT TRUE
       RETURNING item
     ),
     who AS (
       SELECT (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email)) AS counselor,
              (camp201_prework_deadline() IS NOT NULL AND NOW() >= camp201_prework_deadline()) AS past
       FROM camp201_campers c WHERE c.id = $1
     ),
     award AS (
       INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
       SELECT $1,
              CASE WHEN $3::boolean THEN ${PREWORK_PENALTY_POINTS} WHEN w.past THEN 0 ELSE ${PREWORK_POINTS} END,
              CASE WHEN $3::boolean THEN 'Flagged pre-work submission: '
                   WHEN w.past THEN 'Pre-work completed after deadline: '
                   ELSE 'Pre-work completed: ' END || $2::text,
              'system', 'prework'
       FROM done, who w
       WHERE NOT w.counselor AND ($3::boolean OR w.past OR $4::boolean)
       ON CONFLICT DO NOTHING
       RETURNING points
     )
     SELECT (SELECT COUNT(*) FROM done)::int AS newly,
            (SELECT counselor FROM who) AS counselor,
            (SELECT past FROM who) AS past,
            COALESCE((SELECT SUM(points) FROM award), 0)::int AS pts`,
    MarkRow,
    [userId, item, flagged, awardPoints],
    { label: "Mark pre-work complete + award points" }
  );
  const r = rows[0];
  if (!r || r.newly === 0) return none;

  // Counselors never hold points (also enforced by a DB trigger).
  if (r.counselor) return { ...none, newlyCompleted: true };
  if (flagged) return { ...none, newlyCompleted: true, pointsAwarded: r.pts, penaltyApplied: true };
  if (r.past) return { ...none, newlyCompleted: true, pastDeadline: true };

  const earlyBirdPoints = await tryEarlyBird(db, userId);
  return { ...none, newlyCompleted: true, pointsAwarded: r.pts, earlyBirdPoints };
}
