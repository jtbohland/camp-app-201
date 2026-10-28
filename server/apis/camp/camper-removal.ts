import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, isCounselorSql, requireCounselor } from "../../lib/cohort.js";
import { restoreCamper } from "../../lib/camper-removal.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export const RemoveCamper = api({
  name: "RemoveCamper",
  description: "Hides a cAMPer from the cohort, keeping their data",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ camper_id: z.number().int() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);

    // Leave the cohort and team; keep profile, points, and history on the row.
    const removed = await db.query(
      `WITH u AS (
         UPDATE camp201_campers c
         SET removed_at = NOW(), removed_by = $2,
             removed_from_cohort_id = c.cohort_id,
             cohort_id = NULL, team_id = NULL,
             rejoin_requested_at = NULL, updated_at = NOW()
         WHERE c.id = $1 AND c.removed_at IS NULL AND NOT ${isCounselorSql("c")}
         RETURNING c.id, c.email, c.removed_from_cohort_id
       ) SELECT id, email, removed_from_cohort_id FROM u`,
      z.object({ id: z.coerce.number(), email: z.string(), removed_from_cohort_id: z.coerce.number().nullable() }),
      [camper_id, (ctx.user.email ?? "").toLowerCase()],
      { label: "Remove cAMPer from cohort" }
    );
    if (removed.length === 0) {
      throw new Error("This cAMPer couldn't be removed. They may already be removed, or they're a counselor.");
    }

    // They declined: reflect that on the cohort's new-hire list.
    const row = removed[0];
    if (row.removed_from_cohort_id !== null) {
      await db.execute(
        `UPDATE camp201_new_hires SET status = 'declined', updated_at = NOW()
         WHERE cohort_id = $1 AND (camper_id = $2 OR lower(email) = lower($3))`,
        [row.removed_from_cohort_id, row.id, row.email],
        { label: "Mark new hire as Declined" }
      );
    }
    return { success: true };
  },
});

export const RestoreCamper = api({
  name: "RestoreCamper",
  description: "Brings a removed cAMPer back with their points",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ camper_id: z.number().int() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    const restored = await restoreCamper(db, camper_id);
    if (restored === 0) throw new Error("This cAMPer isn't in the removed list anymore.");
    return { success: true };
  },
});

const RemovedCamperSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  points: z.coerce.number(),
  removed_at: z.string(),
  removed_by: z.string().nullable(),
  rejoin_requested_at: z.string().nullable(),
});

export const GetRemovedCampers = api({
  name: "GetRemovedCampers",
  description: "Lists removed cAMPers for counselors",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ campers: z.array(RemovedCamperSchema) }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const campers = await db.query(
      `SELECT id, first_name, last_name, email, role, points,
              removed_at::text, removed_by, rejoin_requested_at::text
       FROM camp201_campers
       WHERE removed_at IS NOT NULL
       ORDER BY rejoin_requested_at DESC NULLS LAST, removed_at DESC
       LIMIT 100`,
      RemovedCamperSchema,
      undefined,
      { label: "List removed cAMPers" }
    );
    return { campers };
  },
});
