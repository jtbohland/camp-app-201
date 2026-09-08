import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateFeatureGate",
  description: "Toggles a feature gate lock state or sets a scheduled unlock time",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    feature_key: z.string(),
    is_locked: z.boolean(),
    unlock_at: z.string().nullable(), // ISO timestamp or null to clear
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_feature_gates
       SET is_locked = $2, unlock_at = $3::timestamptz, updated_by = 'admin', updated_at = NOW()
       WHERE feature_key = $1`,
      [input.feature_key, input.is_locked, input.unlock_at],
      { label: `Update gate: ${input.feature_key}` }
    );
    return { success: true };
  },
});
