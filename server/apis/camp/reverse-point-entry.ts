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
type Entry = z.infer<typeof EntryRow>;

/** Why an entry can't be removed, or null when it can. */
function blockReason(e: Entry): string | null {
  if (e.frozen) return "cAMP has ended for this cohort. Points are final.";
  if (e.reverses_id !== null) return "Already a correction. Use Quick Award to add points back.";
  if (e.already_reversed) return "Already removed.";
  if (e.points === 0) return "Didn't change any points.";
  if (e.category === "team_award") return "Team awards are adjusted from the team.";
  return null;
}

/**
 * Removes one or more wrong awards or deductions by adding an offsetting entry for each (e.g. +10
 * for a -10) that points at the original. Originals stay in the history, marked as removed, and
 * totals move back through the normal point-log trigger. Each entry can be removed once; entries
 * that can't be removed are skipped and reported back.
 */
export default api({
  name: "ReversePointEntry",
  description: "Counselor removes one or more wrong point entries",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    entry_ids: z.array(z.number().int().positive()).min(1).max(100),
    note: z.string().trim().min(3, "Add a short reason").max(300),
  }),
  output: z.object({
    removed: z.number(),
    points_change: z.number(),
    camper_ids: z.array(z.number()),
    skipped: z.array(z.object({ entry_id: z.number(), reason: z.string() })),
  }),
  async run(ctx, { entry_ids, note }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    const counselor = (ctx.user.email ?? "").trim().toLowerCase();
    const ids = [...new Set(entry_ids)];

    const rows = await db.query(
      `SELECT pl.id, pl.camper_id, pl.points, pl.reason, pl.category, pl.reverses_id,
              (EXISTS (SELECT 1 FROM camp201_points_log r WHERE r.reverses_id = pl.id)
               OR (pl.category = 'prework_penalty' AND EXISTS (
                     SELECT 1 FROM camp201_points_log r
                     WHERE r.camper_id = pl.camper_id AND r.category = 'prework_penalty_reversed'))) AS already_reversed,
              camp201_cohort_frozen(c.cohort_id) AS frozen
       FROM camp201_points_log pl JOIN camp201_campers c ON c.id = pl.camper_id
       WHERE pl.id = ANY($1::int[])
       ORDER BY pl.id
       LIMIT 100`,
      EntryRow,
      [ids],
      { label: "Load point entries to remove" }
    );
    const byId = new Map(rows.map((r) => [r.id, r]));

    const skipped: { entry_id: number; reason: string }[] = [];
    const campers = new Set<number>();
    let removed = 0;
    let pointsChange = 0;
    // A cAMPer has one missed-deadline penalty to undo; don't undo it twice in one batch.
    const penaltyUndone = new Set<number>();

    for (const id of ids) {
      const e = byId.get(id);
      if (!e) {
        skipped.push({ entry_id: id, reason: "No longer exists." });
        continue;
      }
      const blocked = blockReason(e);
      if (blocked) {
        skipped.push({ entry_id: id, reason: blocked });
        continue;
      }
      if (e.category === "prework_penalty") {
        if (penaltyUndone.has(e.camper_id)) {
          skipped.push({ entry_id: id, reason: "Already removed." });
          continue;
        }
        penaltyUndone.add(e.camper_id);
      }

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
      if (!inserted[0]) {
        skipped.push({ entry_id: id, reason: "Already removed." });
        continue;
      }
      removed += 1;
      pointsChange += -e.points;
      campers.add(e.camper_id);
    }

    if (removed === 0) {
      throw new Error(skipped.length === 1 ? skipped[0].reason : "None of these entries can be removed.");
    }
    return { removed, points_change: pointsChange, camper_ids: [...campers], skipped };
  },
});
