import { z } from "@superblocksteam/sdk-api";
import { getActiveCohortId } from "./cohort.js";

/** The judge submitting a score: a counselor (has a camper profile) or a guest judge (doesn't). */
export type Judge = {
  email: string;
  name: string;
  camperId: number | null;
  isGuest: boolean;
};

/**
 * Who is scoring, read from the signed-in user. Never from API input, so nobody can
 * submit a score as someone else.
 */
export async function resolveJudge(db: any, email: string | undefined, fallbackName: string | undefined): Promise<Judge> {
  const normalized = (email ?? "").toLowerCase();
  if (!normalized) throw new Error("You must be signed in to score.");
  const rows = await db.query(
    `SELECT
       (SELECT c.id FROM camp201_campers c WHERE lower(c.email) = $1 AND c.role IN ('counselor', 'admin') LIMIT 1) AS camper_id,
       (SELECT NULLIF(trim(concat(c.first_name, ' ', c.last_name)), '') FROM camp201_campers c
         WHERE lower(c.email) = $1 LIMIT 1) AS camper_name,
       EXISTS (SELECT 1 FROM camp201_admins a WHERE lower(a.email) = $1) AS is_listed_admin,
       (SELECT g.name FROM camp201_guest_judges g
         WHERE lower(g.email) = $1 AND g.revoked_at IS NULL
           AND g.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
         LIMIT 1) AS guest_name`,
    z.object({
      camper_id: z.coerce.number().nullable(),
      camper_name: z.string().nullable(),
      is_listed_admin: z.boolean().nullable(),
      guest_name: z.string().nullable(),
    }),
    [normalized],
    { label: "Identify judge" }
  );
  const r = rows[0];
  const isCounselor = (r?.camper_id ?? null) !== null || r?.is_listed_admin === true;
  if (isCounselor) {
    return {
      email: normalized,
      name: r?.camper_name ?? fallbackName ?? normalized.split("@")[0],
      camperId: r?.camper_id ?? null,
      isGuest: false,
    };
  }
  if (r?.guest_name) {
    return { email: normalized, name: r.guest_name, camperId: null, isGuest: true };
  }
  throw new Error("Only counselors and guest judges can score.");
}

/** The active cohort id, or an error (scores always belong to the live cohort). */
export async function requireActiveCohort(db: any): Promise<number> {
  const cohortId = await getActiveCohortId(db);
  if (cohortId === null) throw new Error("There's no active cohort to score.");
  return cohortId;
}

/**
 * Number of judges on the active cohort: counselors in the cohort plus active guest judges.
 * Used for "every judge has scored every team" checks (Mini EBR → ready to close).
 */
export async function countJudges(db: any, cohortId: number): Promise<number> {
  const rows = await db.query(
    `SELECT
       (SELECT COUNT(*) FROM camp201_campers WHERE role IN ('counselor', 'admin') AND cohort_id = $1)
       + (SELECT COUNT(*) FROM camp201_guest_judges WHERE cohort_id = $1 AND revoked_at IS NULL) AS n`,
    z.object({ n: z.coerce.number() }),
    [cohortId],
    { label: "Count judges" }
  );
  return rows[0]?.n ?? 0;
}
