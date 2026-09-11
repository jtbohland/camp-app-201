import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ResultSchema = z.object({
  key: z.string(),
  value: z.string(),
});

export default api({
  name: "ToggleAgendaDayLock",
  description: "Toggle lock/unlock state for a specific agenda day",
  integrations: {
    apps_db: postgres(APPS_DB),
  },
  input: z.object({
    day_number: z.number(),
    locked: z.boolean(),
  }),
  output: z.object({
    success: z.boolean(),
    day_number: z.number(),
    locked: z.boolean(),
  }),
  async run(ctx, { day_number, locked }) {
    const key = `agenda_day_${day_number}_locked`;
    const value = locked ? "true" : "false";

    // Upsert the config row
    await ctx.integrations.apps_db.execute(
      `INSERT INTO camp201_config (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, value],
      { label: `Toggle day ${day_number} lock to ${locked}` },
    );

    return { success: true, day_number, locked };
  },
});
