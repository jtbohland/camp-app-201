import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "UpdateTeamDesign",
  description: "Updates a team's name, logo, and color (team members only)",
  integrations: {
    camp_201_db: postgres(APPS_DB),
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
    // Only a member of this team, signed in as themselves, can save its design.
    const email = (ctx.user.email ?? "").toLowerCase();
    if (!email) return { success: false, message: "You must be signed in." };
    const check = await ctx.integrations.camp_201_db.query(
      `SELECT team_id FROM camp201_campers WHERE id = $1 AND lower(email) = $2 LIMIT 1`,
      z.object({ team_id: z.coerce.number().nullable() }),
      [camper_id, email],
      { label: "Verify team membership" }
    );
    if (check.length === 0 || check[0].team_id !== team_id) {
      return { success: false, message: "Only members of this team can save its design." };
    }
    const validLogo = logo_url.startsWith("data:image/") || /^https?:\/\//.test(logo_url);
    if (!name.trim() || !validLogo || !/^#[0-9a-fA-F]{6}$/.test(color)) {
      return { success: false, message: "Add a team name, color and logo first." };
    }

    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_teams SET name = $2, logo_url = $3, color = $4 WHERE id = $1`,
      [team_id, name.trim().slice(0, 40), logo_url, color],
      { label: "Update team design" }
    );

    return { success: true, message: "Team design saved!" };
  },
});
