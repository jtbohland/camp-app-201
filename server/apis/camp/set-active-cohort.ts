import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, getActiveCohortId, requireCounselor } from "../../lib/cohort.js";
import { saveCohortSnapshot } from "../../lib/cohort-snapshot.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "SetActiveCohort",
  description: "Sets a specific cohort as the active one, deactivating others",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    cohort_id: z.number(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { cohort_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    // Read-only past view: never switch the live cohort while looking at an old one.
    await assertNotViewingPast(db, ctx.user.email);

    // Save the outgoing cohort's final state before it stops being active.
    const outgoing = await getActiveCohortId(db);
    if (outgoing !== null && outgoing !== cohort_id) await saveCohortSnapshot(db, outgoing);

    await db.execute(
      `UPDATE camp201_cohorts SET is_active = false WHERE is_active = true`,
      undefined,
      { label: "Deactivate all cohorts" }
    );
    await db.execute(
      `UPDATE camp201_cohorts SET is_active = true, updated_at = NOW() WHERE id = $1`,
      [cohort_id],
      { label: "Activate selected cohort" }
    );

    return { success: true };
  },
});
