import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const FlightSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  flight_departure_date: z.string().nullable(),
  flight_departure_time: z.string().nullable(),
  leave_office_by: z.string().nullable(),
});

export default api({
  name: "GetFlightSummary",
  description: "Gets all campers' flight departure info for counselor hub.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    flights: z.array(FlightSchema),
  }),
  async run(ctx) {
    const flights = await ctx.integrations.camp_db.query(
      `SELECT id, first_name, last_name, email, flight_departure_date, flight_departure_time, leave_office_by
       FROM camp201_campers
       WHERE role != 'counselor'
       ORDER BY flight_departure_date NULLS LAST, flight_departure_time NULLS LAST, last_name
       LIMIT 50`,
      FlightSchema,
      undefined,
      { label: "Get all flight departure info" }
    );
    return { flights };
  },
});
