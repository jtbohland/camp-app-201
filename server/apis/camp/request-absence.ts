import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "RequestAbsence",
  description: "Camper submits an absence request with time range",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    start_time: z.string(),
    end_time: z.string(),
    reason: z.string().nullable(),
  }),
  output: z.object({ success: z.boolean(), id: z.number() }),
  async run(ctx, input) {
    const IdSchema = z.object({ id: z.number() });
    const result = await ctx.integrations.camp_201_db.query(
      `INSERT INTO camp201_absence_requests (camper_id, start_time, end_time, reason)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      IdSchema,
      [input.camper_id, input.start_time, input.end_time, input.reason],
      { label: "Create absence request" }
    );
    return { success: true, id: result[0].id };
  },
});
