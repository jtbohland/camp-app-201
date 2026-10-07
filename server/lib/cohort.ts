import { z } from "@superblocksteam/sdk-api";

/**
 * SQL subquery that resolves to the active cohort's id.
 * Constant string (no user input) — safe to inline into queries.
 */
export const ACTIVE_COHORT_ID_SQL =
  "(SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)";

/** Returns the active cohort id, or null when no cohort is active. */
export async function getActiveCohortId(db: any): Promise<number | null> {
  const rows = await db.query(
    `SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1`,
    z.object({ id: z.coerce.number() }),
    undefined,
    { label: "Get active cohort" }
  );
  return rows.length > 0 ? rows[0].id : null;
}

/** Throws unless the signed-in user is a verified counselor. */
export async function requireCounselor(db: any, email: string | null | undefined): Promise<void> {
  const normalized = (email ?? "").toLowerCase();
  if (!normalized) throw new Error("You must be signed in.");
  const rows = await db.query(
    `SELECT 1 AS ok FROM camp201_admins WHERE lower(email) = $1
     UNION ALL
     SELECT 1 FROM camp201_campers WHERE lower(email) = $1 AND role IN ('counselor', 'admin')
     LIMIT 1`,
    z.object({ ok: z.coerce.number() }),
    [normalized],
    { label: "Check counselor access" }
  );
  if (rows.length === 0) throw new Error("Only counselors can do this.");
}
