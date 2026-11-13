import { api, z, postgres } from "@superblocksteam/sdk-api";
import { tryChallengerAutoComplete } from "../../lib/challenger-exempt.js";
import { getPreworkDeadline, PREWORK_POINTS } from "../../lib/prework-complete.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const CamperRow = z.object({
  id: z.coerce.number(),
  eligible: z.boolean(),
  profile_completed: z.boolean(),
  early_bird_given: z.boolean(),
  penalty_given: z.boolean(),
  penalty_points: z.coerce.number(),
  early_bird_2day: z.coerce.number(),
  early_bird_1day: z.coerce.number(),
});

const ItemRow = z.object({
  item_key: z.string(),
  title: z.string(),
  icon: z.string().nullable(),
  completed: z.boolean(),
  completed_at: z.string().nullable(),
  earned: z.coerce.number().nullable(),
});

const ItemSchema = z.object({
  key: z.string(),
  title: z.string(),
  icon: z.string(),
  completed: z.boolean(),
  completedAt: z.string().nullable(),
  /** Points logged for this item (null when nothing was logged, e.g. a counselor check-off). */
  pointsEarned: z.number().nullable(),
});

const EMPTY = {
  eligible: false,
  profileCompleted: false,
  items: [],
  completedCount: 0,
  totalCount: 0,
  pointsPerItem: PREWORK_POINTS,
  deadline: null,
  penaltyPoints: 0,
  penaltyApplied: false,
  earlyBird2DayBonus: 0,
  earlyBird1DayBonus: 0,
  earlyBirdGiven: false,
};

export default api({
  name: "GetPreworkReminder",
  description: "Signed-in cAMPer's pre-work checklist, stakes, and deadline for the reminder modal",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    /** Active, non-counselor cAMPer in a live cohort (camp not closed). Only these see the reminder. */
    eligible: z.boolean(),
    profileCompleted: z.boolean(),
    items: z.array(ItemSchema),
    completedCount: z.number(),
    totalCount: z.number(),
    /** Points each pre-work task earns when finished before the deadline. */
    pointsPerItem: z.number(),
    /** When pre-work is due (ISO), or null when no deadline / start date is set yet. */
    deadline: z.string().nullable(),
    /** Points taken off once if anything is unfinished at the deadline. */
    penaltyPoints: z.number(),
    penaltyApplied: z.boolean(),
    earlyBird2DayBonus: z.number(),
    earlyBird1DayBonus: z.number(),
    earlyBirdGiven: z.boolean(),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    // Always the signed-in person, never an id from the browser.
    const email = (ctx.user.email ?? "").trim().toLowerCase();
    if (!email) return EMPTY;

    const campers = await db.query(
      `SELECT c.id,
              (c.removed_at IS NULL
                AND NOT (c.role IN ('counselor', 'admin') OR camp201_is_admin_email(c.email))
                AND c.cohort_id IN (SELECT id FROM camp201_cohorts WHERE is_active = true)
                AND NOT camp201_cohort_frozen(c.cohort_id)
                AND COALESCE((SELECT value FROM camp201_config WHERE key = 'camp_closed' LIMIT 1), 'false') <> 'true'
              ) AS eligible,
              COALESCE(c.profile_completed, false) AS profile_completed,
              EXISTS (SELECT 1 FROM camp201_points_log WHERE camper_id = c.id AND category = 'prework_early_bird') AS early_bird_given,
              EXISTS (SELECT 1 FROM camp201_points_log WHERE camper_id = c.id AND category = 'prework_penalty') AS penalty_given,
              camp201_config_int('deadline_penalty_incomplete', 10) AS penalty_points,
              camp201_config_int('early_bird_2day_bonus', 15) AS early_bird_2day,
              camp201_config_int('early_bird_1day_bonus', 10) AS early_bird_1day
       FROM camp201_campers c
       WHERE lower(c.email) = $1
       ORDER BY c.id DESC
       LIMIT 1`,
      CamperRow,
      [email],
      { label: "Find signed-in cAMPer for pre-work reminder" }
    );
    const camper = campers[0];
    if (!camper || !camper.eligible) return EMPTY;

    // Exempt roles get Challenger checked off first, so it never shows as outstanding.
    await tryChallengerAutoComplete(db, { camperId: camper.id });

    const [rows, deadline] = await Promise.all([
      db.query(
        `SELECT jc.item_key, jc.title, jc.icon,
                COALESCE(p.completed, false) AS completed,
                CASE WHEN p.completed THEN to_char(p.completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') END AS completed_at,
                (SELECT SUM(l.points) FROM camp201_points_log l
                 WHERE l.camper_id = $1 AND l.reason LIKE '%: ' || jc.item_key) AS earned
         FROM camp201_journey_content jc
         LEFT JOIN camp201_prework p ON p.user_id = $1 AND p.item = jc.item_key
         WHERE jc.section = 'prework' AND jc.item_key IS NOT NULL
         ORDER BY jc.sort_order, jc.id
         LIMIT 50`,
        ItemRow,
        [camper.id],
        { label: "Pre-work checklist for reminder" }
      ),
      getPreworkDeadline(db),
    ]);

    const items = rows.map((r) => ({
      key: r.item_key,
      title: r.title,
      icon: r.icon || "circle",
      completed: r.completed,
      completedAt: r.completed_at,
      pointsEarned: r.earned,
    }));

    return {
      eligible: true,
      profileCompleted: camper.profile_completed,
      items,
      completedCount: items.filter((i) => i.completed).length,
      totalCount: items.length,
      pointsPerItem: PREWORK_POINTS,
      deadline,
      penaltyPoints: camper.penalty_points,
      penaltyApplied: camper.penalty_given,
      earlyBird2DayBonus: camper.early_bird_2day,
      earlyBird1DayBonus: camper.early_bird_1day,
      earlyBirdGiven: camper.early_bird_given,
    };
  },
});
