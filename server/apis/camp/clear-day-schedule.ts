import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "ClearDaySchedule",
  description: "Clears all agenda items for a given day, except Lunch.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    day_number: z.number(),
  }),
  output: z.object({ removed: z.coerce.number(), success: z.boolean() }),
  async run(ctx, { day_number }) {
    const result = await ctx.integrations.camp_db.query(
      `WITH deleted AS (
        DELETE FROM camp201_agenda
        WHERE day_number = $1 AND LOWER(title) NOT LIKE '%lunch%'
        RETURNING id
      ) SELECT COUNT(*)::int AS removed FROM deleted`,
      z.object({ removed: z.coerce.number() }),
      [day_number],
      { label: `Clear day ${day_number} schedule (keep lunch)` }
    );
    return { removed: result[0]?.removed ?? 0, success: true };
  },
});
