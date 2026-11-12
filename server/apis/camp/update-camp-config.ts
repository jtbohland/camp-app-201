import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";
import { applyDeadlinePenalty } from "../../lib/prework-complete.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/** Settings that decide when pre-work points end (changing them may make the deadline pass now). */
const DEADLINE_KEYS = ["prework_deadline", "camp_start_date", "deadline_penalty_incomplete"];

export default api({
  name: "UpdateCampConfig",
  description: "Counselors update a cAMP setting; applies the missed-deadline penalty if due",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    key: z.string().trim().min(1).max(100),
    value: z.string().max(5000),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { key, value }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await db.execute(
      `INSERT INTO camp201_config (key, value, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value],
      { label: "Upsert camp config" }
    );
    if (DEADLINE_KEYS.includes(key)) await applyDeadlinePenalty(db);

    return { success: true };
  },
});
