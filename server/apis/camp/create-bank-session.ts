import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "CreateBankSession",
  description: "Adds a new session to the reusable session bank",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    title: z.string(),
    description: z.string().nullable(),
    duration_minutes: z.number(),
    session_type: z.string(),
    created_by: z.string().nullable(),
  }),
  output: z.object({
    id: z.coerce.number(),
    success: z.boolean(),
  }),
  async run(ctx, { title, description, duration_minutes, session_type, created_by }) {
    const result = await ctx.integrations.camp_201_db.query(
      `INSERT INTO camp201_session_bank (title, description, duration_minutes, session_type, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [title, description ?? "", duration_minutes, session_type, created_by ?? ""],
      { label: "Create new bank session" }
    );

    return { id: result[0].id, success: true };
  },
});
