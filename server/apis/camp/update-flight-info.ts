import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "UpdateFlightInfo",
  description: "Updates a camper's flight departure info, or marks them Local (not flying).",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    /** Lives near San Francisco or is otherwise not flying home. */
    is_local: z.boolean(),
    flight_departure_date: z.string().nullable(),
    flight_departure_time: z.string().nullable(),
    leave_office_by: z.string().nullable(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    // Local cAMPers don't fly, so their flight times are cleared.
    await ctx.integrations.camp_db.execute(
      `UPDATE camp201_campers
       SET flight_is_local = $5,
           flight_departure_date = CASE WHEN $5 THEN NULL ELSE $2 END,
           flight_departure_time = CASE WHEN $5 THEN NULL ELSE $3 END,
           leave_office_by = CASE WHEN $5 THEN NULL ELSE $4 END,
           updated_at = NOW()
       WHERE id = $1`,
      [input.camper_id, input.flight_departure_date, input.flight_departure_time, input.leave_office_by, input.is_local],
      { label: "Update flight info" }
    );
    return { success: true };
  },
});
