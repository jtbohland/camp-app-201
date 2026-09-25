import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "AssignTeamMembers",
  description: "Assigns campers to a team by updating their team_id",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    team_id: z.number(),
    camper_ids: z.array(z.number()),
  }),
  output: z.object({
    success: z.boolean(),
    assigned: z.number(),
  }),
  async run(ctx, { team_id, camper_ids }) {
    // Clear previous assignments for these campers
    if (camper_ids.length > 0) {
      await ctx.integrations.camp_201_db.execute(
        `UPDATE camp201_campers SET team_id = $1 WHERE id = ANY($2::int[])`,
        [team_id, camper_ids],
        { label: "Assign campers to team" }
      );
    }

    return { success: true, assigned: camper_ids.length };
  },
});
