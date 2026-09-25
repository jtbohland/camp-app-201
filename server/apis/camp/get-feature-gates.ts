import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const GateSchema = z.object({
  feature_key: z.string(),
  label: z.string(),
  is_locked: z.boolean(),
  unlock_at: z.string().nullable(),
  updated_by: z.string().nullable(),
  updated_at: z.string(),
});

export default api({
  name: "GetFeatureGates",
  description: "Gets all feature gates with auto-unlock check",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    gates: z.array(z.object({
      feature_key: z.string(),
      label: z.string(),
      is_locked: z.boolean(),
      unlock_at: z.string().nullable(),
    })),
  }),
  async run(ctx) {
    // Auto-unlock any gates whose unlock_at has passed
    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_feature_gates
       SET is_locked = false, updated_by = 'auto-unlock', updated_at = NOW()
       WHERE is_locked = true AND unlock_at IS NOT NULL AND unlock_at <= NOW()`,
      undefined,
      { label: "Auto-unlock expired gates" }
    );

    const gates = await ctx.integrations.camp_201_db.query(
      `SELECT feature_key, label, is_locked, unlock_at::text, updated_by, updated_at::text
       FROM camp201_feature_gates
       ORDER BY id
       LIMIT 20`,
      GateSchema,
      undefined,
      { label: "Get all gates" }
    );

    return {
      gates: gates.map(g => ({
        feature_key: g.feature_key,
        label: g.label,
        is_locked: g.is_locked,
        unlock_at: g.unlock_at,
      })),
    };
  },
});
