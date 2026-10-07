import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";
import { resetCampStateForNewCohort } from "../../lib/cohort-reset.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "CreateCohort",
  description: "Starts a new cohort and resets camp state",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    name: z.string().trim().min(1).max(120),
    start_date: z.string().nullable(),
    end_date: z.string().nullable(),
    set_active: z.boolean(),
  }),
  output: z.object({ success: z.boolean(), cohort_id: z.number() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);

    const creator = await db.query(
      `SELECT id FROM camp201_campers WHERE lower(email) = $1 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [(ctx.user.email ?? "").toLowerCase()],
      { label: "Find creator" }
    );

    if (input.set_active) {
      await db.execute(
        `UPDATE camp201_cohorts SET is_active = false, updated_at = NOW() WHERE is_active = true`,
        undefined,
        { label: "Deactivate current cohort" }
      );
    }

    const result = await db.query(
      `INSERT INTO camp201_cohorts (name, start_date, end_date, is_active, created_by)
       VALUES ($1, NULLIF($2, '')::date, NULLIF($3, '')::date, $4, $5) RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [input.name, input.start_date ?? "", input.end_date ?? "", input.set_active, creator[0]?.id ?? null],
      { label: "Create new cohort" }
    );
    const cohortId = result[0].id;

    if (input.set_active) {
      await resetCampStateForNewCohort(db, cohortId, input.start_date || null);
    }

    return { success: true, cohort_id: cohortId };
  },
});
