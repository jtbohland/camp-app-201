import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "RemoveAgendaItem",
  description: "Removes a scheduled session from the agenda",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { id }) {
    await ctx.integrations.apps_database.execute(
      `DELETE FROM camp201_agenda WHERE id = $1`,
      [id],
      { label: "Remove agenda item" }
    );

    return { success: true };
  },
});
