import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const LockSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export default api({
  name: "GetAgendaDayLocks",
  description: "Fetch lock state for all agenda days",
  integrations: {
    apps_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    locks: z.record(z.string(), z.boolean()),
  }),
  async run(ctx) {
    const rows = await ctx.integrations.apps_db.query(
      `SELECT key, value FROM camp201_config WHERE key LIKE 'agenda_day_%_locked'`,
      LockSchema,
      [],
      { label: "Get agenda day lock states" },
    );

    const locks: Record<string, boolean> = {};
    for (const row of rows) {
      // Extract day number from key like "agenda_day_1_locked"
      const match = row.key.match(/agenda_day_(\d+)_locked/);
      if (match) {
        locks[match[1]] = row.value === "true";
      }
    }

    return { locks };
  },
});
