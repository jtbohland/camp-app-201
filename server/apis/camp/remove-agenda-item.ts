import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "RemoveAgendaItem",
  description: "Removes a scheduled session from the agenda",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { id }) {
    await ctx.integrations.camp_201_db.execute(
      `DELETE FROM camp201_agenda WHERE id = $1`,
      [id],
      { label: "Remove agenda item" }
    );

    return { success: true };
  },
});
