import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateTeamDesign",
  description: "Updates a team's name, logo, and color (team members only)",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    team_id: z.number(),
    camper_id: z.number(),
    name: z.string(),
    logo_url: z.string(),
    color: z.string(),
  }),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx, { team_id, camper_id, name, logo_url, color }) {
    // Verify camper is on this team
    const check = await ctx.integrations.apps_database.query(
      `SELECT team_id FROM camp201_campers WHERE id = $1 LIMIT 1`,
      z.object({ team_id: z.coerce.number().nullable() }),
      [camper_id],
      { label: "Verify team membership" }
    );
    if (check.length === 0 || check[0].team_id !== team_id) {
      return { success: false, message: "You can only design your own team" };
    }

    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_teams SET name = $2, logo_url = $3, color = $4 WHERE id = $1`,
      [team_id, name, logo_url, color],
      { label: "Update team design" }
    );

    return { success: true, message: "Team design saved!" };
  },
});
