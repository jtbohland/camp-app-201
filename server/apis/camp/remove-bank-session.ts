import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "RemoveBankSession",
  description: "Removes a session from the bank and any scheduled instances.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { id }) {
    // Remove from agenda first (FK)
    await ctx.integrations.camp_db.execute(
      `UPDATE camp201_agenda SET session_bank_id = NULL WHERE session_bank_id = $1`,
      [id],
      { label: "Unlink agenda items from bank session" }
    );
    // Then remove from bank
    await ctx.integrations.camp_db.execute(
      `DELETE FROM camp201_session_bank WHERE id = $1`,
      [id],
      { label: "Remove session from bank" }
    );
    return { success: true };
  },
});
