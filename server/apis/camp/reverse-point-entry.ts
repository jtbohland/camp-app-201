import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const EntryRow = z.object({
  id: z.coerce.number(),
  camper_id: z.coerce.number(),
  points: z.coerce.number(),
  reason: z.string().nullable(),
  category: z.string().nullable(),
  reverses_id: z.coerce.number().nullable(),
  already_reversed: z.boolean(),
  frozen: z.boolean(),
});

/**
 * Removes a wrong award or deduction by adding an offsetting entry (e.g. +10 for a -10) that points
 * at the original. The original stays in the history, marked as reversed, and the cAMPer's total
 * moves back through the normal point-log trigger. Each entry can be reversed once.
 */
export default api({
  name: "ReversePointEntry",
  description: "Counselor removes a wrong point award or deduction",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    entry_id: z.number().int().positive(),
    note: z.string().trim().min(3, "Add a short reason").max(300),
  }),
  output: z.object({ reversal_id: z.number(), camper_id: z.number(), points_change: z.number() }),
  async run(ctx, { entry_id, note }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    const counselor = (ctx.user.email ?? "").trim().toLowerCase();

    const rows = await db.query(
      `SELECT pl.id, pl.camper_id, pl.points, pl.reason, pl.category, pl.reverses_id,
              (EXISTS (SELECT 1 FROM camp201_points_log r WHERE r.reverses_id = pl.id)
               OR (pl.category = 'prework_penalty' AND EXISTS (
                     SELECT 1 FROM camp201_points_log r
                     WHERE r.camper_id = pl.camper_id AND r.category = 'prework_penalty_reversed'))) AS already_reversed,
              camp201_cohort_frozen(c.cohort_id) AS frozen
       FROM camp201_points_log pl JOIN camp201_campers c ON c.id = pl.camper_id
       WHERE pl.id = $1 LIMIT 1`,
      EntryRow,
      [entry_id],
      { label: "Load point entry to reverse" }
    );
    const e = rows[0];
    if (!e) throw new Error("That point entry no longer exists.");
    if (e.frozen) throw new Error("cAMP has ended for this cohort. Points are final.");
    if (e.reverses_id !== null) throw new Error("This entry is already a reversal. Use Quick Award to add points back.");
    if (e.already_reversed) throw new Error("This entry has already been removed.");
    if (e.points === 0) throw new Error("This entry didn't change any points.");
    if (e.category === "team_award") throw new Error("Team awards count on the team total. Adjust them from the team instead.");

    const original = (e.reason ?? "Points").trim();
    // Undoing the missed-deadline penalty keeps its own category, so pre-work tools know it's gone.
    const category = e.category === "prework_penalty" ? "prework_penalty_reversed" : "reversal";
    const inserted = await db.query(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category, reverses_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (reverses_id) WHERE reverses_id IS NOT NULL DO NOTHING
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [e.camper_id, -e.points, `Removed by counselor: ${original} (${note})`, counselor, category, e.id],
      { label: "Insert offsetting point entry" }
    );
    if (!inserted[0]) throw new Error("This entry has already been removed.");
    return { reversal_id: inserted[0].id, camper_id: e.camper_id, points_change: -e.points };
  },
});
