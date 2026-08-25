import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const AgendaItemSchema = z.object({
  id: z.coerce.number(),
  session_bank_id: z.coerce.number().nullable(),
  day_number: z.coerce.number(),
  start_time: z.string(),
  end_time: z.string(),
  title: z.string(),
  session_type: z.string(),
});

export default api({
  name: "GetAgenda",
  description: "Fetches the full scheduled agenda for all days",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    items: z.array(AgendaItemSchema),
  }),
  async run(ctx) {
    const items = await ctx.integrations.apps_database.query(
      `SELECT id, session_bank_id, day_number, start_time, end_time, title, session_type
       FROM camp201_agenda
       ORDER BY day_number, start_time
       LIMIT 200`,
      AgendaItemSchema,
      undefined,
      { label: "Fetch agenda schedule" }
    );

    return { items };
  },
});
