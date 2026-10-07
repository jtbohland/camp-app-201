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

export type CohortView = {
  /** Cohort whose data this user should see. */
  cohortId: number | null;
  activeCohortId: number | null;
  /** True when a counselor has switched to a cohort other than the active one. */
  isPast: boolean;
};

/**
 * Which cohort's data to show this user. Counselors can pick another cohort in the Hub
 * (camp201_counselor_view); the choice is only honored for verified counselors.
 * Everyone else always gets the active cohort.
 */
export async function resolveViewCohort(db: any, email: string | null | undefined): Promise<CohortView> {
  const normalized = (email ?? "").toLowerCase();
  const rows = await db.query(
    `SELECT
       (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1) AS active_id,
       (SELECT v.cohort_id FROM camp201_counselor_view v
         WHERE v.email = $1
           AND (EXISTS (SELECT 1 FROM camp201_admins a WHERE lower(a.email) = $1)
                OR EXISTS (SELECT 1 FROM camp201_campers c WHERE lower(c.email) = $1 AND c.role IN ('counselor', 'admin')))
         LIMIT 1) AS view_id`,
    z.object({ active_id: z.coerce.number().nullable(), view_id: z.coerce.number().nullable() }),
    [normalized],
    { label: "Resolve viewing cohort" }
  );
  const activeId = rows[0]?.active_id ?? null;
  const viewId = rows[0]?.view_id ?? null;
  return {
    cohortId: viewId ?? activeId,
    activeCohortId: activeId,
    isPast: viewId !== null && viewId !== activeId,
  };
}

/**
 * Throws if this counselor is viewing a past cohort. Call at the top of APIs that change
 * live cohort data, so a stale tab or direct request can't write while in read-only mode.
 */
export async function assertNotViewingPast(db: any, email: string | null | undefined): Promise<void> {
  const view = await resolveViewCohort(db, email);
  if (view.isPast) {
    throw new Error("You're viewing a past cohort (read-only). Switch back to the active cohort to make changes.");
  }
}

/** Inlines a cohort id into SQL. Only ever called with ids read from the database. */
export function cohortIdSql(id: number | null): string {
  return id === null ? "NULL" : String(Math.trunc(Number(id)));
}
