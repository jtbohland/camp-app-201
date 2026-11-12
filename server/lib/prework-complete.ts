import { z } from "@superblocksteam/sdk-api";

export const PREWORK_PENALTY_POINTS = -3;
const PREWORK_POINTS = 5;

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

/**
 * Marks one pre-work item complete for a cAMPer and awards points, only the first time.
 * Already-complete items are left exactly as they are (no extra points, no changes).
 * Points are awarded by writing a point-log entry; the database adds it to the total.
 */
export async function markPreworkComplete(
  db: any,
  userId: number,
  item: string,
  { flagged, awardPoints }: MarkOptions
): Promise<MarkResult> {
  const none: MarkResult = { newlyCompleted: false, pointsAwarded: 0, penaltyApplied: false, pastDeadline: false, earlyBirdPoints: 0 };
  // RETURNING tells us for certain whether this call is the one that completed it.
  const inserted = await db.query(
    `WITH done AS (
       INSERT INTO camp201_prework (user_id, item, completed, completed_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (user_id, item) DO UPDATE
         SET completed = true, completed_at = COALESCE(camp201_prework.completed_at, NOW())
         WHERE camp201_prework.completed IS NOT TRUE
       RETURNING item
     )
     SELECT COUNT(*)::int AS n FROM done`,
    z.object({ n: z.coerce.number() }),
    [userId, item],
    { label: "Mark pre-work item complete" }
  );
  const newlyCompleted = (inserted[0]?.n ?? 0) > 0;
  if (!newlyCompleted) return none;

  // Counselors never hold points (also enforced by a DB trigger), so award/deduct nothing.
  const roleRows = await db.query(
    `SELECT role FROM camp201_campers WHERE id = $1 LIMIT 1`,
    z.object({ role: z.string().nullable() }),
    [userId],
    { label: "Check camper role" }
  );
  if ((roleRows[0]?.role ?? "").toLowerCase() === "counselor") {
    return { ...none, newlyCompleted: true };
  }

  if (flagged) {
    await db.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
       VALUES ($1, $2, $3, 'system', 'prework')`,
      [userId, PREWORK_PENALTY_POINTS, `Flagged pre-work submission: ${item}`],
      { label: "Deduct flagged submission penalty" }
    );
    return { ...none, newlyCompleted: true, pointsAwarded: PREWORK_PENALTY_POINTS, penaltyApplied: true };
  }

  if (await isPastPreworkDeadline(db)) {
    return { ...none, newlyCompleted: true, pastDeadline: true };
  }

  let pointsAwarded = 0;
  if (awardPoints) {
    await db.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
       VALUES ($1, $2, $3, 'system', 'prework')`,
      [userId, PREWORK_POINTS, `Pre-work completed: ${item}`],
      { label: "Award pre-work points" }
    );
    pointsAwarded = PREWORK_POINTS;
  }
  const earlyBirdPoints = await tryEarlyBird(db, userId);
  return { ...none, newlyCompleted: true, pointsAwarded, earlyBirdPoints };
}
