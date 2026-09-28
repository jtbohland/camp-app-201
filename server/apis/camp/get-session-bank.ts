import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const SessionBankItemSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  description: z.string().nullable(),
  duration_minutes: z.coerce.number(),
  session_type: z.string(),
  created_by: z.string().nullable(),
});

export default api({
  name: "GetSessionBank",
  description: "Fetches all sessions in the reusable session bank",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    sessions: z.array(SessionBankItemSchema),
  }),
  async run(ctx) {
    const sessions = await ctx.integrations.camp_201_db.query(
      `SELECT id, title, description, duration_minutes, session_type, created_by
       FROM camp201_session_bank
       ORDER BY title ASC
       LIMIT 200`,
      SessionBankItemSchema,
      undefined,
      { label: "Fetch session bank" }
    );

    return { sessions };
  },
});
