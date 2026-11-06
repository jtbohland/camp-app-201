import { z } from "@superblocksteam/sdk-api";

export const PREWORK_PENALTY_POINTS = -3;
const PREWORK_POINTS = 5;

/** True once cAMP has started. Pre-work finished after that earns 0 points. */
export async function hasCampStarted(db: any): Promise<boolean> {
  const rows = await db.query(
    `SELECT value FROM camp201_config WHERE key = 'camp_start_date' LIMIT 1`,
    z.object({ value: z.string().nullable() }),
    undefined,
    { label: "Check camp_start_date" }
  );
  const raw = rows[0]?.value;
  if (!raw) return false;
  const start = new Date(raw);
  return !isNaN(start.getTime()) && new Date() >= start;
}

type MarkOptions = {
  /** The submission looked off (e.g. Wheel & Deal scores out of range): deduct instead of award. */
  flagged: boolean;
  /** Award the normal pre-work points (false for roles exempt from Challenger). */
  awardPoints: boolean;
};

/**
 * Marks one pre-work item complete for a cAMPer and awards points, only the first time.
 * Already-complete items are left exactly as they are (no extra points, no changes).
 */
export async function markPreworkComplete(
  db: any,
  userId: number,
  item: string,
  { flagged, awardPoints }: MarkOptions
): Promise<{ newlyCompleted: boolean; pointsAwarded: number; penaltyApplied: boolean }> {
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
  if (!newlyCompleted) return { newlyCompleted: false, pointsAwarded: 0, penaltyApplied: false };

  // Counselors never hold points (also enforced by a DB trigger), so award/deduct nothing.
  const roleRows = await db.query(
    `SELECT role FROM camp201_campers WHERE id = $1 LIMIT 1`,
    z.object({ role: z.string().nullable() }),
    [userId],
    { label: "Check camper role" }
  );
  if ((roleRows[0]?.role ?? "").toLowerCase() === "counselor") {
    return { newlyCompleted: true, pointsAwarded: 0, penaltyApplied: false };
  }

  if (flagged) {
    await db.execute(
      `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
      [PREWORK_PENALTY_POINTS, userId],
      { label: "Deduct flagged submission penalty" }
    );
    await db.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
       VALUES ($1, $2, $3, 'system')`,
      [userId, PREWORK_PENALTY_POINTS, `Flagged pre-work submission: ${item}`],
      { label: "Log flagged penalty" }
    );
    return { newlyCompleted: true, pointsAwarded: PREWORK_PENALTY_POINTS, penaltyApplied: true };
  }

  if (!awardPoints || (await hasCampStarted(db))) {
    return { newlyCompleted: true, pointsAwarded: 0, penaltyApplied: false };
  }

  await db.execute(
    `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
    [PREWORK_POINTS, userId],
    { label: "Award pre-work points" }
  );
  await db.execute(
    `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
     VALUES ($1, $2, $3, 'system')`,
    [userId, PREWORK_POINTS, `Pre-work completed: ${item}`],
    { label: "Log pre-work points" }
  );
  return { newlyCompleted: true, pointsAwarded: PREWORK_POINTS, penaltyApplied: false };
}
