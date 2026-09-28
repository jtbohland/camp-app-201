import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "ScheduleSession",
  description: "Places a session onto the agenda at a specific day and time",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    session_bank_id: z.number().nullable(),
    day_number: z.number(),
    start_time: z.string(),
    end_time: z.string(),
    title: z.string(),
    session_type: z.string(),
  }),
  output: z.object({
    id: z.coerce.number(),
    success: z.boolean(),
  }),
  async run(ctx, { session_bank_id, day_number, start_time, end_time, title, session_type }) {
    const result = await ctx.integrations.camp_201_db.query(
      `INSERT INTO camp201_agenda (session_bank_id, day_number, start_time, end_time, title, session_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [session_bank_id, day_number, start_time, end_time, title, session_type],
      { label: "Schedule session on agenda" }
    );

    return { id: result[0].id, success: true };
  },
});
