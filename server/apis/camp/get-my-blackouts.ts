import { api, z, postgres } from "@superblocksteam/sdk-api";
import {
  BlackoutConflictSchema,
  BlackoutSessionSchema,
  appliesToRole,
  findBlackoutConflicts,
  loadBlackoutWindows,
} from "../../lib/blackouts.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/** The signed-in cAMPer's required sessions and any of their absences that overlap one. */
export default api({
  name: "GetMyBlackouts",
  description: "Lists the signed-in cAMPer's required sessions and absence conflicts",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    start_date_set: z.boolean(),
    sessions: z.array(BlackoutSessionSchema),
    /** Approved absences that overlap a required session (still need action or were acknowledged). */
    conflicts: z.array(BlackoutConflictSchema),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_db;
    const me = await db.query(
      `SELECT id, role FROM camp201_campers
       WHERE lower(email) = lower($1) AND removed_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      z.object({ id: z.coerce.number(), role: z.string().nullable() }),
      [ctx.user.email ?? ""],
      { label: "Find signed-in cAMPer" }
    );
    if (!me[0]) return { start_date_set: false, sessions: [], conflicts: [] };

    const { startDateSet, windows } = await loadBlackoutWindows(db);
    const sessions = windows.filter((w) => appliesToRole(w.roles, me[0].role));
    const conflicts = (await findBlackoutConflicts(db, me[0].id)).filter((c) => c.status === "approved");
    return { start_date_set: startDateSet, sessions, conflicts };
  },
});
