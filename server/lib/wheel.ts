import { z } from "@superblocksteam/sdk-api";
import { ACTIVE_COHORT_ID_SQL, isCounselorSql, isTeamEligibleSql } from "./cohort.js";

export type WheelScorer = { camperId: number; cohortId: number | null; isCounselor: boolean };

/** The signed-in person's cAMP profile (active cohort first). Null when they have none. */
export async function resolveWheelScorer(db: any, email: string | null | undefined): Promise<WheelScorer | null> {
  const normalized = (email ?? "").toLowerCase().trim();
  if (!normalized) return null;
  const rows = await db.query(
    `SELECT c.id, c.cohort_id, ${isCounselorSql("c")} AS is_counselor
       FROM camp201_campers c
      WHERE lower(c.email) = $1 AND c.removed_at IS NULL
      ORDER BY (c.cohort_id = ${ACTIVE_COHORT_ID_SQL}) DESC NULLS LAST, c.id DESC
      LIMIT 1`,
    z.object({ id: z.coerce.number(), cohort_id: z.coerce.number().nullable(), is_counselor: z.boolean() }),
    [normalized],
    { label: "Find signed-in cAMPer" }
  );
  if (rows.length === 0) return null;
  return { camperId: rows[0].id, cohortId: rows[0].cohort_id, isCounselor: rows[0].is_counselor };
}

/**
 * SQL condition: camper row `alias` is expected to score a round pitched by `pitcherSql`
 * (eligible cAMPer in the pitcher's cohort, not removed, not a counselor, not the pitcher).
 * Arguments are constant aliases / parameter placeholders only.
 */
export function expectedScorerSql(alias: string, pitcherSql: string): string {
  const cohort = `(SELECT pc.cohort_id FROM camp201_campers pc WHERE pc.id = ${pitcherSql})`;
  return `(${alias}.cohort_id = ${cohort}
    AND ${alias}.removed_at IS NULL
    AND ${alias}.id <> ${pitcherSql}
    AND ${isTeamEligibleSql(alias, cohort)})`;
}

/** Turns stored score JSON into a plain category → number map. */
export function toScoreMap(value: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (!value || typeof value !== "object") return out;
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const n = Number(v);
    if (Number.isFinite(n)) out[k] = n;
  }
  return out;
}
