import { api, z, postgres } from "@superblocksteam/sdk-api";
import { resolveViewCohort } from "../../lib/cohort.js";
import { getCohortSnapshot } from "../../lib/cohort-snapshot.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const CounselorSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string(),
  photo_url: z.string().nullable(),
  visible_in_cohort: z.boolean().nullable(),
});

export default api({
  name: "GetCounselorRotation",
  description: "Lists the viewed cohort's counselors with visibility",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    counselors: z.array(CounselorSchema),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const view = await resolveViewCohort(db, ctx.user.email);

    // Past cohort: counselors move to each new cohort, so use the list saved when it ended.
    if (view.isPast) {
      const snapshot = await getCohortSnapshot(db, view.cohortId);
      const ids = snapshot?.counselor_ids ?? [];
      if (ids.length === 0) return { counselors: [] };
      const counselors = await db.query(
        `SELECT c.id, c.first_name, c.last_name, c.email, c.photo_url, true AS visible_in_cohort
         FROM camp201_campers c
         WHERE c.id = ANY($1::int[])
         ORDER BY c.first_name, c.last_name
         LIMIT 50`,
        CounselorSchema,
        [ids],
        { label: "Fetch past cohort counselors" }
      );
      return { counselors };
    }

    // Counselors attached to the active cohort, plus anyone with no cohort yet
    // (e.g. verified before any cohort was active).
    const counselors = await db.query(
      `SELECT c.id, c.first_name, c.last_name, c.email, c.photo_url, c.visible_in_cohort
       FROM camp201_campers c
       WHERE c.role IN ('counselor', 'admin')
         AND (c.cohort_id IS NULL
              OR c.cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1))
       ORDER BY c.first_name, c.last_name
       LIMIT 50`,
      CounselorSchema,
      undefined,
      { label: "Fetch active cohort counselors" }
    );
    return { counselors };
  },
});
