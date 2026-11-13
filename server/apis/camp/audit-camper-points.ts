import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/**
 * One row per active cAMPer: what the rules say they earned vs. what their history shows.
 * Pre-work: every finished item must have exactly one log line (+5 on time, -3 flagged, 0 late).
 */
const AuditRow = z.object({
  camper_id: z.coerce.number(),
  name: z.string(),
  total: z.coerce.number(),
  log_sum: z.coerce.number(),
  prework_done: z.coerce.number(),
  prework_logged: z.coerce.number(),
  prework_missing: z.array(z.string()).nullable(),
  prework_duplicates: z.coerce.number(),
  registration_owed: z.boolean(),
  profile_owed: z.boolean(),
  early_bird_owed: z.boolean(),
  has_audit_line: z.boolean(),
  /** Registration still has blanks: the cAMPer is blocked by the finish-registration pop-up until they fill them in. */
  registration_incomplete: z.boolean(),
});

const AUDIT_SQL = `
  WITH cfg AS (SELECT camp201_prework_deadline() AS d),
  items AS (SELECT DISTINCT item_key FROM camp201_journey_content WHERE section = 'prework' AND item_key IS NOT NULL),
  campers AS (
    SELECT c.* FROM camp201_campers c
    WHERE c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
      AND c.removed_at IS NULL
      AND NOT (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email))
  ),
  done AS (
    SELECT pw.user_id, pw.item,
           -- Finished after the deadline (worth 0) or a flagged submission (counselor review): never auto-awarded.
           ((SELECT d FROM cfg) IS NOT NULL AND COALESCE(pw.completed_at, pw.created_at) >= (SELECT d FROM cfg)) AS late,
           EXISTS (SELECT 1 FROM camp201_prework_submissions s
                   WHERE s.camper_id = pw.user_id AND s.item_key = pw.item AND s.flagged = true) AS flagged
    FROM camp201_prework pw JOIN items i ON i.item_key = pw.item
    WHERE pw.completed = true AND pw.user_id IN (SELECT id FROM campers)
  ),
  logged AS (
    SELECT pl.camper_id, regexp_replace(pl.reason, '^(Pre-work completed after deadline|Pre-work completed|Flagged pre-work submission): ', '') AS item,
           COUNT(*) AS n
    FROM camp201_points_log pl
    WHERE pl.camper_id IN (SELECT id FROM campers)
      AND pl.reason ~ '^(Pre-work completed after deadline|Pre-work completed|Flagged pre-work submission): '
    GROUP BY 1, 2
  )
  SELECT c.id AS camper_id,
         TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) AS name,
         COALESCE(c.points, 0) AS total,
         COALESCE((SELECT SUM(points) FROM camp201_points_log WHERE camper_id = c.id AND COALESCE(category, '') <> 'team_award'), 0) AS log_sum,
         (SELECT COUNT(*) FROM done d WHERE d.user_id = c.id) AS prework_done,
         (SELECT COUNT(*) FROM done d JOIN logged l ON l.camper_id = d.user_id AND l.item = d.item WHERE d.user_id = c.id) AS prework_logged,
         (SELECT array_agg(d.item ORDER BY d.item) FROM done d
            WHERE d.user_id = c.id AND NOT d.late AND NOT d.flagged
              AND NOT EXISTS (SELECT 1 FROM logged l WHERE l.camper_id = d.user_id AND l.item = d.item)) AS prework_missing,
         COALESCE((SELECT SUM(l.n - 1) FROM logged l WHERE l.camper_id = c.id AND l.n > 1), 0) AS prework_duplicates,
         (NOT EXISTS (SELECT 1 FROM camp201_points_log WHERE camper_id = c.id AND reason = 'Registration completed')
            AND btrim(COALESCE(c.first_name, '')) <> '' AND btrim(COALESCE(c.last_name, '')) <> ''
            AND btrim(COALESCE(c.role, '')) NOT IN ('', 'camper')
            AND btrim(COALESCE(c.manager_email, '')) <> '' AND btrim(COALESCE(c.region, '')) <> ''
            AND btrim(COALESCE(c.country, '')) <> '' AND btrim(COALESCE(c.city, '')) <> ''
            AND c.start_date IS NOT NULL AND btrim(COALESCE(c.pin, '')) <> '') AS registration_owed,
         (c.profile_completed = true
            AND ((SELECT d FROM cfg) IS NULL OR NOW() < (SELECT d FROM cfg))
            AND NOT EXISTS (SELECT 1 FROM camp201_points_log WHERE camper_id = c.id AND reason = 'Profile completed')) AS profile_owed,
         ((SELECT d FROM cfg) IS NOT NULL
            AND (SELECT COUNT(*) FROM done d WHERE d.user_id = c.id) = (SELECT COUNT(*) FROM items)
            AND (SELECT COUNT(*) FROM items) > 0
            AND (SELECT (SELECT d FROM cfg) - MAX(pw.completed_at) FROM camp201_prework pw JOIN items i ON i.item_key = pw.item
                 WHERE pw.user_id = c.id AND pw.completed) >= INTERVAL '24 hours'
            AND NOT EXISTS (SELECT 1 FROM camp201_points_log WHERE camper_id = c.id AND category = 'prework_early_bird')) AS early_bird_owed,
         EXISTS (SELECT 1 FROM camp201_points_log WHERE camper_id = c.id AND category = 'audit') AS has_audit_line,
         NOT (btrim(COALESCE(c.first_name, '')) <> '' AND btrim(COALESCE(c.last_name, '')) <> ''
            AND btrim(COALESCE(c.role, '')) NOT IN ('', 'camper')
            AND btrim(COALESCE(c.manager_email, '')) <> '' AND btrim(COALESCE(c.region, '')) <> ''
            AND btrim(COALESCE(c.country, '')) <> '' AND btrim(COALESCE(c.city, '')) <> ''
            AND c.start_date IS NOT NULL AND btrim(COALESCE(c.pin, '')) <> '') AS registration_incomplete
  FROM campers c
  ORDER BY name
  LIMIT 500`;

const ResultRow = AuditRow.extend({
  ok: z.boolean(),
  issues: z.array(z.string()),
  /** Nothing to fix here: the cAMPer has to finish registration (they're prompted every time they open the app). */
  waiting_on_camper: z.boolean(),
});

const REG_INCOMPLETE = "Registration incomplete: they're blocked by the finish-registration pop-up and earn the +10 once they finish it";
const AUDIT_NOTE = "Has an earlier 'Audit balance' line. Check it doesn't already cover this before fixing.";

function issuesOf(r: z.infer<typeof AuditRow>): string[] {
  const out: string[] = [];
  const missing = r.prework_missing ?? [];
  if (missing.length) out.push(`Pre-work with no points: ${missing.join(", ")}`);
  if (r.prework_duplicates > 0) out.push(`${r.prework_duplicates} duplicate pre-work award(s)`);
  if (r.registration_incomplete) {
    out.push(REG_INCOMPLETE);
  } else if (r.registration_owed) {
    out.push("Registration +10 not given");
  }
  if (r.profile_owed) out.push("Profile +15 not given");
  if (r.early_bird_owed) out.push("Early-bird bonus not given");
  if (r.total !== r.log_sum) out.push(`Total ${r.total} doesn't match history ${r.log_sum}`);
  // Only worth a warning when there's something a counselor would actually fix.
  if (r.has_audit_line && out.some((i) => i !== REG_INCOMPLETE)) out.push(AUDIT_NOTE);
  return out;
}

async function runAudit(db: any) {
  const rows: z.infer<typeof AuditRow>[] = await db.query(AUDIT_SQL, AuditRow, undefined, { label: "Audit every cAMPer's points" });
  return rows.map((r) => {
    const issues = issuesOf(r);
    // Only blocker is the registration they still owe: counselors can't fix that for them.
    const waiting = r.registration_incomplete && issues.every((i) => i === REG_INCOMPLETE);
    return { ...r, issues, ok: issues.length === 0, waiting_on_camper: waiting };
  });
}

export const AuditCamperPoints = api({
  name: "AuditCamperPoints",
  description: "Checks every active cAMPer's points against the scoring rules",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ campers: z.array(ResultRow) }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    return { campers: await runAudit(db) };
  },
});

export const FixCamperPoints = api({
  name: "FixCamperPoints",
  description: "Awards missing points so every total matches the scoring rules",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    /** One cAMPer, or null for everyone in the active cohort. */
    camper_id: z.number().int().positive().nullable(),
  }),
  output: z.object({
    fixed: z.number(),
    points_added: z.number(),
    campers: z.array(ResultRow),
  }),
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);

    // A counselor running this has reviewed the list, so cAMPers with an old audit line are included.
    const rows = await db.query(
      `SELECT c.id, camp201_reconcile_camper_points(c.id, true) AS added
       FROM camp201_campers c
       WHERE c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true ORDER BY id DESC LIMIT 1)
         AND c.removed_at IS NULL
         AND ($1::int IS NULL OR c.id = $1::int)
       LIMIT 500`,
      z.object({ id: z.coerce.number(), added: z.coerce.number() }),
      [camper_id],
      { label: "Reconcile cAMPer points" }
    );
    const changed = rows.filter((r) => r.added !== 0);
    return {
      fixed: changed.length,
      points_added: changed.reduce((s, r) => s + r.added, 0),
      campers: await runAudit(db),
    };
  },
});
