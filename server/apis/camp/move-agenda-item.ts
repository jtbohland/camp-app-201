import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "MoveAgendaItem",
  description: "Moves an agenda item to a new day/time slot.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
    day_number: z.number(),
    start_time: z.string(),
    end_time: z.string(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { id, day_number, start_time, end_time }) {
    await ctx.integrations.camp_db.execute(
      `UPDATE camp201_agenda SET day_number = $1, start_time = $2, end_time = $3 WHERE id = $4`,
      [day_number, start_time, end_time, id],
      { label: "Move agenda item" }
    );
    return { success: true };
  },
});
