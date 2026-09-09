import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SaveTeamWorkspace",
  description: "Saves the shared team workspace (any team member can edit)",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    team_id: z.number(),
    camper_id: z.number(),
    responses: z.string(), // JSON string
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { presentation_id, team_id, camper_id, responses }) {
    // Verify the camper is on this team (or admin)
    const camper = await ctx.integrations.apps_database.query(
      `SELECT id, team_id, role FROM camp201_campers WHERE id = $1 LIMIT 1`,
      z.object({ id: z.coerce.number(), team_id: z.coerce.number().nullable(), role: z.string() }),
      [camper_id],
      { label: "Verify team membership" }
    );

    if (camper.length === 0) return { success: false };
    const isAdmin = camper[0].role === "counselor" || camper[0].role === "admin";
    if (!isAdmin && camper[0].team_id !== team_id) return { success: false };

    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_team_workspace (presentation_id, team_id, responses, last_edited_by, updated_at)
       VALUES ($1, $2, $3::jsonb, $4, NOW())
       ON CONFLICT (presentation_id, team_id)
       DO UPDATE SET responses = $3::jsonb, last_edited_by = $4, updated_at = NOW()`,
      [presentation_id, team_id, responses, camper_id],
      { label: "Upsert team workspace" }
    );

    return { success: true };
  },
});
