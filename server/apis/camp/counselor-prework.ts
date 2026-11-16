import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";
import { getPreworkDeadline, PREWORK_POINTS, tryEarlyBird } from "../../lib/prework-complete.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/** Items that normally need a submission first. A counselor check-off records a placeholder instead. */
const SUBMISSION_GATED = ["wheel_and_deal", "challenger_sales"];

const CamperRow = z.object({
  id: z.coerce.number(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  is_counselor: z.boolean(),
  removed: z.boolean(),
  frozen: z.boolean(),
  active_cohort: z.boolean(),
  penalty_given: z.boolean(),
  penalty_reversed: z.boolean(),
  early_bird_given: z.boolean(),
  early_bird_2day: z.coerce.number(),
  early_bird_1day: z.coerce.number(),
});
type Camper = z.infer<typeof CamperRow>;

async function loadCamper(db: any, camperId: number): Promise<Camper | null> {
  const rows = await db.query(
    `SELECT c.id, c.first_name, c.last_name,
            (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email)) AS is_counselor,
            (c.removed_at IS NOT NULL) AS removed,
            camp201_cohort_frozen(c.cohort_id) AS frozen,
            (c.cohort_id IN (SELECT id FROM camp201_cohorts WHERE is_active = true)) AS active_cohort,
            EXISTS (SELECT 1 FROM camp201_points_log WHERE camper_id = c.id AND category = 'prework_penalty') AS penalty_given,
            EXISTS (SELECT 1 FROM camp201_points_log WHERE camper_id = c.id AND category = 'prework_penalty_reversed') AS penalty_reversed,
            EXISTS (SELECT 1 FROM camp201_points_log WHERE camper_id = c.id AND category = 'prework_early_bird') AS early_bird_given,
            camp201_config_int('early_bird_2day_bonus', 15) AS early_bird_2day,
            camp201_config_int('early_bird_1day_bonus', 10) AS early_bird_1day
     FROM camp201_campers c WHERE c.id = $1 LIMIT 1`,
    CamperRow,
    [camperId],
    { label: "Load cAMPer for counselor pre-work" }
  );
  return rows[0] ?? null;
}

/** Why a counselor can't check off this cAMPer's pre-work, or null when they can. */
function blockedReason(c: Camper): string | null {
  if (c.is_counselor) return "Counselors don't have pre-work.";
  if (c.removed) return "This cAMPer has been removed from the cohort.";
  if (c.frozen) return "cAMP has ended for this cohort. Points are final.";
  if (!c.active_cohort) return "This cAMPer isn't in the active cohort.";
  return null;
}

const ItemRow = z.object({
  item_key: z.string(),
  title: z.string(),
  completed: z.boolean(),
  completed_at: z.string().nullable(),
  completed_by: z.string().nullable(),
});

const ChecklistItem = z.object({
  key: z.string(),
  title: z.string(),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
  /** Counselor email when a counselor checked it off; null when the cAMPer did it. */
  completedBy: z.string().nullable(),
});

export const GetCamperPreworkChecklist = api({
  name: "GetCamperPreworkChecklist",
  description: "Counselor view of one cAMPer's pre-work checklist",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ camper_id: z.number() }),
  output: z.object({
    camperName: z.string(),
    /** Null when a counselor can mark items complete; otherwise the reason they can't. */
    blockedReason: z.string().nullable(),
    items: z.array(ChecklistItem),
    deadline: z.string().nullable(),
    pointsPerItem: z.number(),
    earlyBird2DayBonus: z.number(),
    earlyBird1DayBonus: z.number(),
    earlyBirdGiven: z.boolean(),
    penaltyApplied: z.boolean(),
  }),
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const camper = await loadCamper(db, camper_id);
    if (!camper) throw new Error("cAMPer not found.");

    const [rows, deadline] = await Promise.all([
      db.query(
        `SELECT jc.item_key, jc.title,
                COALESCE(p.completed, false) AS completed,
                CASE WHEN p.completed THEN to_char(p.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') END AS completed_at,
                CASE WHEN p.completed THEN p.completed_by END AS completed_by
         FROM camp201_journey_content jc
         LEFT JOIN camp201_prework p ON p.user_id = $1 AND p.item = jc.item_key
         WHERE jc.section = 'prework' AND jc.item_key IS NOT NULL
         ORDER BY jc.sort_order, jc.id
         LIMIT 50`,
        ItemRow,
        [camper_id],
        { label: "cAMPer pre-work checklist" }
      ),
      getPreworkDeadline(db),
    ]);

    return {
      camperName: [camper.first_name, camper.last_name].filter(Boolean).join(" ") || "This cAMPer",
      blockedReason: blockedReason(camper),
      items: rows.map((r) => ({
        key: r.item_key,
        title: r.title,
        completed: r.completed,
        completedAt: r.completed_at,
        completedBy: r.completed_by,
      })),
      deadline,
      pointsPerItem: PREWORK_POINTS,
      earlyBird2DayBonus: camper.early_bird_2day,
      earlyBird1DayBonus: camper.early_bird_1day,
      earlyBirdGiven: camper.early_bird_given,
      penaltyApplied: camper.penalty_given && !camper.penalty_reversed,
    };
  },
});

const MarkRow = z.object({
  newly: z.coerce.number(),
  pts: z.coerce.number(),
  late: z.coerce.number(),
});

export const CounselorCompletePrework = api({
  name: "CounselorCompletePrework",
  description: "Counselor marks a cAMPer's pre-work complete on a chosen date",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    camper_id: z.number(),
    items: z.array(z.string()).min(1),
    /** Pacific-time date the work was done, "YYYY-MM-DD". Saved as noon PT that day. */
    completed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  }),
  output: z.object({
    itemsMarked: z.number(),
    /** Items that were already complete and left as they were. */
    alreadyDone: z.number(),
    pointsAwarded: z.number(),
    /** Items finished after the deadline: done, for 0 points. */
    lateItems: z.number(),
    earlyBirdPoints: z.number(),
    penaltyReversed: z.number(),
  }),
  async run(ctx, { camper_id, items, completed_on }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const counselorEmail = (ctx.user.email ?? "").trim().toLowerCase();

    const camper = await loadCamper(db, camper_id);
    if (!camper) throw new Error("cAMPer not found.");
    const blocked = blockedReason(camper);
    if (blocked) throw new Error(blocked);

    const dateCheck = await db.query(
      `SELECT ($1::date > (NOW() AT TIME ZONE 'America/Los_Angeles')::date) AS future`,
      z.object({ future: z.boolean() }),
      [completed_on],
      { label: "Check completion date" }
    );
    if (dateCheck[0]?.future) throw new Error("The completion date can't be in the future.");

    // Only real pre-work items, each once.
    const valid = await db.query(
      `SELECT DISTINCT item_key FROM camp201_journey_content
       WHERE section = 'prework' AND item_key = ANY($1::text[]) LIMIT 50`,
      z.object({ item_key: z.string() }),
      [Array.from(new Set(items))],
      { label: "Validate pre-work items" }
    );
    const keys = valid.map((v) => v.item_key);
    if (keys.length === 0) throw new Error("None of those are pre-work items.");

    // Gated items normally need a submission. Record a placeholder so the Journey tile reads
    // "Marked complete by a counselor" (never overwrites a real submission).
    const gated = keys.filter((k) => SUBMISSION_GATED.includes(k));
    if (gated.length > 0) {
      await db.execute(
        `INSERT INTO camp201_prework_submissions (camper_id, item_key, submission_data, flagged)
         SELECT $1, k, $3::jsonb, false FROM unnest($2::text[]) AS k
         ON CONFLICT (camper_id, item_key) DO NOTHING`,
        [camper_id, gated, JSON.stringify({ counselor_completed: true, completed_by: counselorEmail })],
        { label: "Save counselor placeholder submissions" }
      );
    }

    // Check-offs and their point-log lines in ONE statement (same rules as a cAMPer finishing:
    // +5 before the deadline, a 0-pt "after deadline" line otherwise). Noon PT on the chosen
    // day, never later than now. Already-complete items are left untouched.
    const marked = await db.query(
      `WITH ts AS (
         SELECT LEAST((($3::date + time '12:00') AT TIME ZONE 'America/Los_Angeles'), NOW()) AS at,
                camp201_prework_deadline() AS d
       ),
       done AS (
         INSERT INTO camp201_prework (user_id, item, completed, completed_at, completed_by)
         SELECT $1, k, true, ts.at, $4 FROM unnest($2::text[]) AS k, ts
         ON CONFLICT (user_id, item) DO UPDATE
           SET completed = true, completed_at = EXCLUDED.completed_at, completed_by = EXCLUDED.completed_by
           WHERE camp201_prework.completed IS NOT TRUE
         RETURNING item
       ),
       award AS (
         INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
         SELECT $1,
                CASE WHEN ts.d IS NOT NULL AND ts.at >= ts.d THEN 0 ELSE ${PREWORK_POINTS} END,
                CASE WHEN ts.d IS NOT NULL AND ts.at >= ts.d THEN 'Pre-work completed after deadline: '
                     ELSE 'Pre-work completed: ' END || done.item,
                $4, 'prework'
         FROM done, ts
         ON CONFLICT DO NOTHING
         RETURNING points
       )
       SELECT (SELECT COUNT(*) FROM done)::int AS newly,
              COALESCE((SELECT SUM(points) FROM award), 0)::int AS pts,
              (SELECT COUNT(*) FROM award WHERE points = 0)::int AS late`,
      MarkRow,
      [camper_id, keys, completed_on, counselorEmail],
      { label: "Counselor: mark pre-work complete + award points" }
    );
    const m = marked[0] ?? { newly: 0, pts: 0, late: 0 };

    // Missed-deadline penalty: undo it once if every item now counts as finished before the deadline.
    let penaltyReversed = 0;
    if (camper.penalty_given && !camper.penalty_reversed) {
      const rev = await db.query(
        `WITH pen AS (
           SELECT points FROM camp201_points_log
           WHERE camper_id = $1 AND category = 'prework_penalty' LIMIT 1
         ),
         ok AS (
           SELECT NOT EXISTS (
             SELECT 1 FROM camp201_journey_content jc
             WHERE jc.section = 'prework' AND jc.item_key IS NOT NULL
               AND NOT EXISTS (SELECT 1 FROM camp201_prework p
                               WHERE p.user_id = $1 AND p.item = jc.item_key AND p.completed = true
                                 AND p.completed_at < camp201_prework_deadline())
           ) AS all_on_time
         ),
         ins AS (
           INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
           SELECT $1, -pen.points, 'Missed-deadline penalty reversed (pre-work marked complete by a counselor)', $2, 'prework_penalty_reversed'
           FROM pen, ok
           WHERE ok.all_on_time AND pen.points < 0
             AND NOT EXISTS (SELECT 1 FROM camp201_points_log
                             WHERE camper_id = $1 AND category = 'prework_penalty_reversed')
           RETURNING points
         )
         SELECT COALESCE((SELECT SUM(points) FROM ins), 0)::int AS pts`,
        z.object({ pts: z.coerce.number() }),
        [camper_id, counselorEmail],
        { label: "Reverse missed-deadline penalty if now on time" }
      );
      penaltyReversed = rev[0]?.pts ?? 0;
    }

    // Early bird by the normal rules (uses when the last item was finished).
    const earlyBirdPoints = m.newly > 0 ? await tryEarlyBird(db, camper_id) : 0;

    return {
      itemsMarked: m.newly,
      alreadyDone: keys.length - m.newly,
      pointsAwarded: m.pts,
      lateItems: m.late,
      earlyBirdPoints,
      penaltyReversed,
    };
  },
});
