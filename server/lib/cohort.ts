import { z } from "@superblocksteam/sdk-api";

/**
 * SQL subquery that resolves to the active cohort's id.
 * Constant string (no user input) — safe to inline into queries.
 */
export const ACTIVE_COHORT_ID_SQL =
  "(SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)";

/**
 * SQL condition: true when the camper row (aliased `alias`) is a counselor — either by role
 * or because their email is on the admin list. Constant string — safe to inline.
 */
export function isCounselorSql(alias: string): string {
  return `(${alias}.role IN ('counselor', 'admin') OR EXISTS (SELECT 1 FROM camp201_admins adm WHERE lower(adm.email) = lower(${alias}.email)))`;
}

/**
 * SQL that matches a cohort's new-hire list rows to the camper row (aliased `alias`),
 * by linked camper_id or by email. `cohortSql` must be a constant or a cohortIdSql() value.
 */
function newHireMatchSql(alias: string, cohortSql: string, extra = ""): string {
  return `EXISTS (SELECT 1 FROM camp201_new_hires nh
    WHERE nh.cohort_id = ${cohortSql}
      AND (nh.camper_id = ${alias}.id OR lower(nh.email) = lower(${alias}.email))${extra})`;
}

/**
 * SQL condition: true when a camper should go on a team. They must not be a counselor, and either
 * be marked Accepted on the cohort's new-hire list, or not be on that list at all (signed up directly).
 * People on the list as Invited or Declined are left out.
 */
export function isTeamEligibleSql(alias: string, cohortSql: string): string {
  return `(NOT ${isCounselorSql(alias)} AND (
    ${newHireMatchSql(alias, cohortSql, " AND nh.status = 'accepted'")}
    OR NOT ${newHireMatchSql(alias, cohortSql)}
  ))`;
}

/** SQL condition: true when the camper is on the cohort's new-hire list at all. */
export function isOnNewHireListSql(alias: string, cohortSql: string): string {
  return newHireMatchSql(alias, cohortSql);
}

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

/**
 * SQL condition: the lowercased email in `$1` is a guest judge for the active cohort.
 * Access ends on its own when cAMP is closed or another cohort becomes active.
 * Constant string - safe to inline.
 */
export const GUEST_JUDGE_ACCESS_SQL = `EXISTS (SELECT 1 FROM camp201_guest_judges g
  WHERE lower(g.email) = $1 AND g.revoked_at IS NULL
    AND g.cohort_id = ${ACTIVE_COHORT_ID_SQL}
    AND COALESCE((SELECT value FROM camp201_config WHERE key = 'camp_closed' LIMIT 1), 'false') <> 'true')`;

export type CounselorAccess = {
  /** Counselor access of any kind (verified counselor or active guest judge). */
  isAdmin: boolean;
  /** Temporary counselor access added from a rubric. No counselor profile. */
  isGuestJudge: boolean;
};

/** Who the signed-in user is: counselor, guest judge, or neither. */
export async function getCounselorAccess(db: any, email: string | null | undefined): Promise<CounselorAccess> {
  const normalized = (email ?? "").toLowerCase();
  if (!normalized) return { isAdmin: false, isGuestJudge: false };
  const rows = await db.query(
    `SELECT
       (EXISTS (SELECT 1 FROM camp201_admins WHERE lower(email) = $1)
        OR EXISTS (SELECT 1 FROM camp201_campers WHERE lower(email) = $1 AND role IN ('counselor', 'admin'))) AS is_counselor,
       ${GUEST_JUDGE_ACCESS_SQL} AS is_guest`,
    z.object({ is_counselor: z.boolean().nullable(), is_guest: z.boolean().nullable() }),
    [normalized],
    { label: "Check counselor access" }
  );
  const isCounselor = rows[0]?.is_counselor === true;
  const isGuest = rows[0]?.is_guest === true;
  return { isAdmin: isCounselor || isGuest, isGuestJudge: isGuest && !isCounselor };
}

export type SpeakerAccess = { executiveId: number; name: string };

/**
 * The active guest speaker whose email matches the signed-in user, or null.
 * Speakers get limited access: Cohort, Agenda, their own Q&A, Teams & Rankings, and Past cAMPs.
 */
export async function getSpeakerAccess(db: any, email: string | null | undefined): Promise<SpeakerAccess | null> {
  const normalized = (email ?? "").toLowerCase().trim();
  if (!normalized) return null;
  const rows = await db.query(
    `SELECT id, name FROM camp201_executives
     WHERE lower(btrim(email)) = $1 AND is_active = true
     ORDER BY id DESC LIMIT 1`,
    z.object({ id: z.coerce.number(), name: z.string() }),
    [normalized],
    { label: "Check guest speaker access" }
  );
  return rows[0] ? { executiveId: rows[0].id, name: rows[0].name } : null;
}

/** Throws unless the signed-in user is a verified counselor or an active guest judge. */
export async function requireCounselor(db: any, email: string | null | undefined): Promise<void> {
  if (!(email ?? "").trim()) throw new Error("You must be signed in.");
  const access = await getCounselorAccess(db, email);
  if (!access.isAdmin) throw new Error("Only counselors can do this.");
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
