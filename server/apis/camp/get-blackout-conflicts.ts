import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";
import { BlackoutConflictSchema, findBlackoutConflicts, loadBlackoutWindows } from "../../lib/blackouts.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/** Counselors: every absence in the active cohort that overlaps a required session. */
export default api({
  name: "GetBlackoutConflicts",
  description: "Lists absences that overlap required blackout sessions",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    start_date_set: z.boolean(),
    blackout_count: z.number(),
    conflicts: z.array(BlackoutConflictSchema),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_db;
    await requireCounselor(db, ctx.user.email);
    const { startDateSet, windows } = await loadBlackoutWindows(db);
    const conflicts = await findBlackoutConflicts(db, null);
    return { start_date_set: startDateSet, blackout_count: windows.length, conflicts };
  },
});
