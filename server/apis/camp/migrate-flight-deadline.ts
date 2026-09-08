import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateFlightAndDeadline",
  description: "Adds flight departure columns and prework deadline config.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    // Add flight departure columns to campers
    await ctx.integrations.camp_db.execute(`
      ALTER TABLE camp201_campers
      ADD COLUMN IF NOT EXISTS flight_departure_date TEXT,
      ADD COLUMN IF NOT EXISTS flight_departure_time TEXT,
      ADD COLUMN IF NOT EXISTS leave_office_by TEXT
    `, undefined, { label: "Add flight departure columns" });

    // Add prework_deadline and early_bird configs
    await ctx.integrations.camp_db.execute(`
      INSERT INTO camp201_config (key, value) VALUES
        ('prework_deadline', '')
      ON CONFLICT (key) DO NOTHING
    `, undefined, { label: "Seed prework_deadline config" });

    await ctx.integrations.camp_db.execute(`
      INSERT INTO camp201_config (key, value) VALUES
        ('early_bird_2day_bonus', '15'),
        ('early_bird_1day_bonus', '10'),
        ('deadline_penalty_per_item', '10')
      ON CONFLICT (key) DO NOTHING
    `, undefined, { label: "Seed early bird + penalty configs" });

    return { success: true };
  },
});
