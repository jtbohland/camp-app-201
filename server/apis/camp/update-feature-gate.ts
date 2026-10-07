import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "UpdateFeatureGate",
  description: "Toggles a feature gate lock state or sets a scheduled unlock time",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    feature_key: z.string(),
    is_locked: z.boolean(),
    unlock_at: z.string().nullable(), // ISO timestamp or null to clear
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    await assertNotViewingPast(ctx.integrations.camp_201_db, ctx.user.email);
    // Only verified counselors can change locks.
    const email = (ctx.user.email ?? "").toLowerCase();
    const admin = await ctx.integrations.camp_201_db.query(
      `SELECT 1 AS ok FROM camp201_admins WHERE lower(email) = $1
       UNION ALL
       SELECT 1 FROM camp201_campers WHERE lower(email) = $1 AND role IN ('counselor', 'admin')
       LIMIT 1`,
      z.object({ ok: z.coerce.number() }),
      [email],
      { label: "Check admin access" }
    );
    if (admin.length === 0) throw new Error("Only counselors can change section locks.");

    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_feature_gates
       SET is_locked = $2, unlock_at = $3::timestamptz, updated_by = 'admin', updated_at = NOW()
       WHERE feature_key = $1`,
      [input.feature_key, input.is_locked, input.unlock_at],
      { label: `Update gate: ${input.feature_key}` }
    );
    return { success: true };
  },
});
