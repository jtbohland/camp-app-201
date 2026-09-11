/**
 * Shared helper to award a repeatable badge with accelerated points.
 * Increments earn_count, calculates accelerated points, awards to camper.
 *
 * Returns the points awarded.
 */
import { z } from "@superblocksteam/sdk-api";
import { calculateAcceleratedPoints, BADGE_IDS } from "./accelerator.js";

type DbClient = {
  query: (...args: any[]) => Promise<any[]>;
  execute: (...args: any[]) => Promise<any>;
};

export async function awardRepeatableBadge(
  db: DbClient,
  camperId: number,
  badgeId: number,
  reason: string,
  cohortId?: number | null,
): Promise<{ points: number; earnCount: number }> {
  // Get current earn count
  const CountSchema = z.object({ earn_count: z.coerce.number() });
  const existing = await db.query(
    `SELECT earn_count FROM camp201_camper_badges WHERE camper_id = $1 AND badge_id = $2 LIMIT 1`,
    CountSchema,
    [camperId, badgeId],
    { label: `Check earn count for badge ${badgeId}` }
  );

  let currentCount = 0;
  if (existing.length > 0) {
    currentCount = existing[0].earn_count;
    // Increment earn count
    await db.execute(
      `UPDATE camp201_camper_badges SET earn_count = earn_count + 1 WHERE camper_id = $1 AND badge_id = $2`,
      [camperId, badgeId],
      { label: `Increment badge ${badgeId} earn count` }
    );
  } else {
    // First earn — insert
    await db.execute(
      `INSERT INTO camp201_camper_badges (camper_id, badge_id, earn_count)
       VALUES ($1, $2, 1) ON CONFLICT (camper_id, badge_id) DO UPDATE SET earn_count = camp201_camper_badges.earn_count + 1`,
      [camperId, badgeId],
      { label: `Award first badge ${badgeId}` }
    );
  }

  const newCount = currentCount + 1;
  const points = calculateAcceleratedPoints(badgeId, currentCount);

  if (points > 0) {
    // Award points to individual
    await db.execute(
      `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
      [points, camperId],
      { label: `Award ${points} accelerated pts` }
    );
    await db.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason, cohort_id)
       VALUES ($1, $2, $3, $4)`,
      [camperId, points, reason, cohortId ?? null],
      { label: `Log accelerated pts` }
    );
  }

  return { points, earnCount: newCount };
}
