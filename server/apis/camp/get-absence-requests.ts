import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetAbsenceRequests",
  description: "Gets absence requests - for admin view or a specific camper",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number().nullable(),
  }),
  output: z.object({
    requests: z.array(z.object({
      id: z.number(),
      camper_id: z.number(),
      camper_name: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      reason: z.string().nullable(),
      status: z.string(),
      created_at: z.string(),
    })),
  }),
  async run(ctx, { camper_id }) {
    const RequestSchema = z.object({
      id: z.number(),
      camper_id: z.number(),
      camper_name: z.string(),
      start_time: z.string(),
      end_time: z.string(),
      reason: z.string().nullable(),
      status: z.string(),
      created_at: z.string(),
    });

    const whereClause = camper_id ? `WHERE a.camper_id = $1` : ``;
    const params = camper_id ? [camper_id] : undefined;

    const requests = await ctx.integrations.apps_database.query(
      `SELECT a.id, a.camper_id, CONCAT(c.first_name, ' ', c.last_name) as camper_name,
              a.start_time, a.end_time, a.reason, a.status, a.created_at
       FROM camp201_absence_requests a
       JOIN camp201_campers c ON c.id = a.camper_id
       ${whereClause}
       ORDER BY a.start_time DESC
       LIMIT 50`,
      RequestSchema,
      params,
      { label: "Get absence requests" }
    );

    return { requests };
  },
});
