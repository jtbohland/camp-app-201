import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "AssignTeamMembers",
  description: "Assigns campers to a team by updating their team_id",
  integrations: {
    apps_database: postgres(APPS_DB),
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
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET team_id = $1 WHERE id = ANY($2::int[])`,
        [team_id, camper_ids],
        { label: "Assign campers to team" }
      );
    }

    return { success: true, assigned: camper_ids.length };
  },
});
