import { z } from "@superblocksteam/sdk-api";
import { ACTIVE_COHORT_ID_SQL } from "./cohort.js";

/**
 * Removing a cAMPer hides them without deleting anything: they leave the cohort
 * (cohort_id = NULL) and their team, so every cohort-scoped screen, the leaderboard,
 * and the team generator skip them. Profile, points, and history stay on the row.
 */

/** SQL condition: the camper row (aliased `alias`) has not been removed. Constant string. */
export function notRemovedSql(alias: string): string {
  return `${alias}.removed_at IS NULL`;
}

/**
 * Brings a removed cAMPer back into the active cohort with their profile and points,
 * and marks them Accepted on that cohort's new-hire list (if they're on it).
 * Returns the number of camper rows restored (0 or 1).
 */
export async function restoreCamper(db: any, camperId: number): Promise<number> {
  const rows = await db.query(
    `WITH u AS (
       UPDATE camp201_campers
       SET cohort_id = ${ACTIVE_COHORT_ID_SQL},
           removed_at = NULL, removed_by = NULL, removed_from_cohort_id = NULL,
           rejoin_requested_at = NULL, updated_at = NOW()
       WHERE id = $1 AND removed_at IS NOT NULL
       RETURNING id, email
     ) SELECT id, email FROM u`,
    z.object({ id: z.coerce.number(), email: z.string() }),
    [camperId],
    { label: "Restore removed cAMPer" }
  );
  if (rows.length === 0) return 0;

  await db.execute(
    `UPDATE camp201_new_hires SET status = 'accepted', camper_id = $1, updated_at = NOW()
     WHERE cohort_id = ${ACTIVE_COHORT_ID_SQL}
       AND (camper_id = $1 OR lower(email) = lower($2))`,
    [camperId, rows[0].email],
    { label: "Mark restored cAMPer as Accepted" }
  );
  return rows.length;
}
