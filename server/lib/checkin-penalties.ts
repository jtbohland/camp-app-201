import { z } from "@superblocksteam/sdk-api";

/**
 * Late/missed check-in penalties. Each late or missed check-in (no approved absence, no counselor
 * back-fill) costs its own bracket's rate: 1st–3rd -2, 4th–6th -5, 7th+ -10. The math lives in the
 * database (camp201_sync_checkin_penalties) so every path charges the same way and only the
 * difference is ever logged.
 */
export const STRIKE_BRACKETS = [
  { from: 1, to: 3, points: -2 },
  { from: 4, to: 6, points: -5 },
  { from: 7, to: null, points: -10 },
] as const;

/** At this many late/missed check-ins, a cAMPer is asked to see a counselor (from the next cohort on). */
export const PRESENCE_MEMO_AT = 7;

/** Re-syncs one cAMPer's penalties. Never throws: a sync problem must not block a check-in. */
export async function syncCheckinPenalties(db: any, camperId: number | null | undefined): Promise<number> {
  if (!camperId) return 0;
  try {
    const rows = await db.query(
      `SELECT camp201_sync_checkin_penalties($1) AS delta`,
      z.object({ delta: z.coerce.number().nullable() }),
      [camperId],
      { label: "Sync late/missed check-in penalties" }
    );
    return rows[0]?.delta ?? 0;
  } catch {
    return 0;
  }
}

/** Re-syncs everyone in a check-in's cohort (after it closes, misses become final). */
export async function syncSessionCohortPenalties(db: any, sessionId: number): Promise<number> {
  try {
    const rows = await db.query(
      `SELECT camp201_sync_cohort_checkin_penalties(
         (SELECT cohort_id FROM camp201_checkin_sessions WHERE id = $1)) AS delta`,
      z.object({ delta: z.coerce.number().nullable() }),
      [sessionId],
      { label: "Sync penalties for the cohort" }
    );
    return rows[0]?.delta ?? 0;
  } catch {
    return 0;
  }
}
