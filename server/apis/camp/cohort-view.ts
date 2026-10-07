import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor, resolveViewCohort } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const ViewSchema = z.object({
  cohort_id: z.number().nullable(),
  cohort_name: z.string().nullable(),
  active_cohort_id: z.number().nullable(),
  is_past: z.boolean(),
  has_snapshot: z.boolean(),
});

async function describe(db: any, email: string | null | undefined) {
  const view = await resolveViewCohort(db, email);
  const rows = await db.query(
    `SELECT c.name, EXISTS (SELECT 1 FROM camp201_cohort_snapshots s WHERE s.cohort_id = c.id) AS has_snapshot
     FROM camp201_cohorts c WHERE c.id = $1 LIMIT 1`,
    z.object({ name: z.string(), has_snapshot: z.boolean() }),
    [view.cohortId ?? 0],
    { label: "Describe viewing cohort" }
  );
  return {
    cohort_id: view.cohortId,
    cohort_name: rows[0]?.name ?? null,
    active_cohort_id: view.activeCohortId,
    is_past: view.isPast,
    has_snapshot: rows[0]?.has_snapshot ?? false,
  };
}

/** Which cohort the signed-in user is looking at. Non-counselors always get the active cohort. */
export const GetViewCohort = api({
  name: "GetViewCohort",
  description: "Returns the cohort this user is viewing",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: ViewSchema,
  async run(ctx) {
    return describe(ctx.integrations.camp_201_db, ctx.user.email);
  },
});

/** Counselor-only: switch the whole app to a past cohort (read-only), or back to the active one. */
export const SetViewCohort = api({
  name: "SetViewCohort",
  description: "Switches which cohort a counselor is viewing",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    // null = back to the active cohort
    cohort_id: z.number().int().positive().nullable(),
  }),
  output: ViewSchema,
  async run(ctx, { cohort_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const email = (ctx.user.email ?? "").toLowerCase();

    if (cohort_id !== null) {
      const exists = await db.query(
        `SELECT 1 AS ok FROM camp201_cohorts WHERE id = $1 LIMIT 1`,
        z.object({ ok: z.coerce.number() }),
        [cohort_id],
        { label: "Check cohort exists" }
      );
      if (exists.length === 0) throw new Error("That cohort doesn't exist.");
    }

    await db.execute(
      `INSERT INTO camp201_counselor_view (email, cohort_id, updated_at) VALUES ($1, $2, NOW())
       ON CONFLICT (email) DO UPDATE SET cohort_id = EXCLUDED.cohort_id, updated_at = NOW()`,
      [email, cohort_id],
      { label: "Save viewing cohort" }
    );
    return describe(db, ctx.user.email);
  },
});
