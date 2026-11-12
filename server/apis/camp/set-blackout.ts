import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";
import { cleanRoles, findBlackoutConflicts } from "../../lib/blackouts.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/**
 * Marks a session as required (blackout) or not, for every role or selected roles.
 * - target "agenda": one calendar tile.
 * - target "bank": the Session Bank session plus every tile scheduled from it.
 */
export default api({
  name: "SetBlackout",
  description: "Marks a session as a required blackout for chosen roles",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    target: z.enum(["agenda", "bank"]),
    id: z.number().int(),
    is_blackout: z.boolean(),
    /** Standard roles it applies to. Empty = every role. */
    roles: z.array(z.string()).max(20),
  }),
  output: z.object({
    success: z.boolean(),
    tiles_updated: z.number(),
    /** Approved absences that now overlap a blackout (whole cohort, after this change). */
    open_conflicts: z.number(),
  }),
  async run(ctx, { target, id, is_blackout, roles }) {
    const db = ctx.integrations.camp_db;
    await requireCounselor(db, ctx.user.email);

    const finalRoles = is_blackout ? cleanRoles(roles) : [];
    const rolesJson = JSON.stringify(finalRoles);
    let tiles = 0;

    if (target === "bank") {
      const found = await db.query(
        `SELECT id FROM camp201_session_bank WHERE id = $1 LIMIT 1`,
        z.object({ id: z.coerce.number() }),
        [id],
        { label: "Find Session Bank session" }
      );
      if (!found[0]) throw new Error("That session is no longer in the Session Bank. Refresh and try again.");
      await db.execute(
        `UPDATE camp201_session_bank SET is_blackout = $2, blackout_roles = $3::jsonb WHERE id = $1`,
        [id, is_blackout, rolesJson],
        { label: "Update Session Bank blackout" }
      );
      const updated = await db.query(
        `WITH u AS (
           UPDATE camp201_agenda SET is_blackout = $2, blackout_roles = $3::jsonb
           WHERE session_bank_id = $1 RETURNING id
         ) SELECT COUNT(*) AS n FROM u`,
        z.object({ n: z.coerce.number() }),
        [id, is_blackout, rolesJson],
        { label: "Update scheduled tiles from this session" }
      );
      tiles = updated[0]?.n ?? 0;
    } else {
      const updated = await db.query(
        `WITH u AS (
           UPDATE camp201_agenda SET is_blackout = $2, blackout_roles = $3::jsonb
           WHERE id = $1 RETURNING id
         ) SELECT COUNT(*) AS n FROM u`,
        z.object({ n: z.coerce.number() }),
        [id, is_blackout, rolesJson],
        { label: "Update agenda tile blackout" }
      );
      tiles = updated[0]?.n ?? 0;
      if (tiles === 0) throw new Error("That session is no longer on the agenda. Refresh and try again.");
    }

    const conflicts = await findBlackoutConflicts(db, null);
    return {
      success: true,
      tiles_updated: tiles,
      open_conflicts: conflicts.filter((c) => c.status === "approved").length,
    };
  },
});
