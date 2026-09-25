import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "SetupBadgeTypes",
  description: "Adds badge_type/base_points to badges and earn_count to camper_badges",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Add badge_type column: 'badge' (repeatable) or 'merit' (one-time)
    await ctx.integrations.camp_201_db.execute(
      `ALTER TABLE camp201_badges ADD COLUMN IF NOT EXISTS badge_type TEXT NOT NULL DEFAULT 'badge'`,
      undefined,
      { label: "Add badge_type column" }
    );

    // Add base_points to badges (for accelerator calculation)
    await ctx.integrations.camp_201_db.execute(
      `ALTER TABLE camp201_badges ADD COLUMN IF NOT EXISTS base_points INTEGER NOT NULL DEFAULT 0`,
      undefined,
      { label: "Add base_points column" }
    );

    // Add earn_count to camper_badges (for repeatable badges)
    await ctx.integrations.camp_201_db.execute(
      `ALTER TABLE camp201_camper_badges ADD COLUMN IF NOT EXISTS earn_count INTEGER NOT NULL DEFAULT 1`,
      undefined,
      { label: "Add earn_count column" }
    );

    // Drop unique constraint on (camper_id, badge_id) if it exists, so we can use UPSERT with earn_count
    // First check if the constraint exists
    const constraints = await ctx.integrations.camp_201_db.query(
      `SELECT conname FROM pg_constraint
       WHERE conrelid = 'camp201_camper_badges'::regclass
       AND contype = 'u' LIMIT 5`,
      z.object({ conname: z.string() }),
      undefined,
      { label: "Check existing unique constraints" }
    );

    for (const c of constraints) {
      if (c.conname.includes('camper_id') || c.conname.includes('badge')) {
        await ctx.integrations.camp_201_db.execute(
          `ALTER TABLE camp201_camper_badges DROP CONSTRAINT IF EXISTS ${c.conname}`,
          undefined,
          { label: `Drop constraint ${c.conname}` }
        );
      }
    }

    // Add a unique constraint that we'll use for UPSERT
    await ctx.integrations.camp_201_db.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_camper_badge_unique ON camp201_camper_badges (camper_id, badge_id)`,
      undefined,
      { label: "Create unique index for upsert" }
    );

    return { success: true, message: "Badge type system columns added" };
  },
});
