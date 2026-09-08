import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateBankSession",
  description: "Updates an existing session in the bank.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().nullable(),
    duration_minutes: z.number(),
    session_type: z.string(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { id, title, description, duration_minutes, session_type }) {
    await ctx.integrations.camp_db.execute(
      `UPDATE camp201_session_bank SET title = $1, description = $2, duration_minutes = $3, session_type = $4 WHERE id = $5`,
      [title, description, duration_minutes, session_type, id],
      { label: "Update bank session" }
    );
    return { success: true };
  },
});
