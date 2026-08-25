import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

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
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    sessions: z.array(SessionBankItemSchema),
  }),
  async run(ctx) {
    const sessions = await ctx.integrations.apps_database.query(
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
