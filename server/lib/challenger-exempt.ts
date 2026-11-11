import { z } from "@superblocksteam/sdk-api";
import { mapToStandardRole, type StandardRole } from "./roles.js";
import { markPreworkComplete } from "./prework-complete.js";

/**
 * Roles that already took Challenger in cAMP Ascent onboarding. Their Challenger pre-work is
 * checked off automatically and earns the same +5 pts as everyone else (normal pre-work rules:
 * once only, 0 after cAMP starts).
 * Keep in sync with camp201_challenger_exempt() (migration 0026).
 */
const EXEMPT_ROLES: ReadonlySet<StandardRole> = new Set<StandardRole>([
  "SDR",
  "AE – Velocity",
  "AE – Emerging",
  "AE – Enterprise",
  "AE – Strategic",
  "Renewals",
  "Partners",
]);

/** Plain "Account Executive" titles (no segment) still count as AE. */
const AE_TITLE = /(account executive|\bae\b)/;

export function isChallengerExempt(role: string | null | undefined): boolean {
  const r = (role ?? "").trim();
  if (!r) return false;
  const lower = r.toLowerCase();
  if (lower === "counselor" || lower === "admin") return false;
  const mapped = mapToStandardRole(r);
  if (mapped && EXEMPT_ROLES.has(mapped)) return true;
  return AE_TITLE.test(lower);
}

const CHALLENGER = "challenger_sales";

const CamperRow = z.object({
  id: z.coerce.number(),
  role: z.string().nullable(),
  eligible: z.boolean(),
  done: z.boolean(),
});

/**
 * Checks off Challenger for an exempt cAMPer if it isn't done yet. Safe to call any time:
 * does nothing for other roles, removed cAMPers, ended (frozen) cohorts, or if already complete.
 */
export async function ensureChallengerAutoComplete(
  db: any,
  where: { camperId: number } | { email: string }
): Promise<{ completed: boolean; pointsAwarded: number }> {
  const none = { completed: false, pointsAwarded: 0 };
  const byId = "camperId" in where;
  const rows: z.infer<typeof CamperRow>[] = await db.query(
    `SELECT c.id, c.role,
            (c.removed_at IS NULL AND NOT camp201_cohort_frozen(c.cohort_id)
              AND c.cohort_id IN (SELECT id FROM camp201_cohorts WHERE is_active = true)) AS eligible,
            EXISTS (SELECT 1 FROM camp201_prework pw
                    WHERE pw.user_id = c.id AND pw.item = '${CHALLENGER}' AND pw.completed = true) AS done
     FROM camp201_campers c
     WHERE ${byId ? "c.id = $1" : "lower(c.email) = lower($1)"}
     LIMIT 1`,
    CamperRow,
    [byId ? where.camperId : where.email],
    { label: "Challenger auto-complete: check cAMPer" }
  );
  const c = rows[0];
  if (!c || c.done || !c.eligible || !isChallengerExempt(c.role)) return none;

  // Record why it was checked off (never overwrite an existing screenshot submission).
  await db.execute(
    `INSERT INTO camp201_prework_submissions (camper_id, item_key, submission_data, flagged)
     VALUES ($1, '${CHALLENGER}', $2::jsonb, false)
     ON CONFLICT (camper_id, item_key) DO NOTHING`,
    [c.id, JSON.stringify({ auto_completed: true, reason: `Role: ${c.role} (completed Challenger in cAMP Ascent)` })],
    { label: "Challenger auto-complete: save reason" }
  );

  const result = await markPreworkComplete(db, c.id, CHALLENGER, { flagged: false, awardPoints: true });
  return { completed: result.newlyCompleted, pointsAwarded: result.pointsAwarded };
}

/** Same as ensureChallengerAutoComplete but never throws (for use after unrelated saves). */
export async function tryChallengerAutoComplete(
  db: any,
  where: { camperId: number } | { email: string }
): Promise<{ completed: boolean; pointsAwarded: number }> {
  try {
    return await ensureChallengerAutoComplete(db, where);
  } catch {
    return { completed: false, pointsAwarded: 0 };
  }
}
