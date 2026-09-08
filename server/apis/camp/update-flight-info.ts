import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateFlightInfo",
  description: "Updates a camper's flight departure info.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    flight_departure_date: z.string().nullable(),
    flight_departure_time: z.string().nullable(),
    leave_office_by: z.string().nullable(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    await ctx.integrations.camp_db.execute(
      `UPDATE camp201_campers
       SET flight_departure_date = $2, flight_departure_time = $3, leave_office_by = $4, updated_at = NOW()
       WHERE id = $1`,
      [input.camper_id, input.flight_departure_date, input.flight_departure_time, input.leave_office_by],
      { label: "Update flight info" }
    );
    return { success: true };
  },
});
