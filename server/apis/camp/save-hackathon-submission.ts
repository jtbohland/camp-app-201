import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SaveHackathonSubmission",
  description: "Saves or updates a team's hackathon submission",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    team_id: z.number(),
    camper_id: z.number(),
    app_name: z.string(),
    description: z.string(),
    use_case: z.string(),
    how_it_works: z.string(),
    who_uses_it: z.string(),
    app_link: z.string().nullable(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_hackathon_submissions (presentation_id, team_id, app_name, description, use_case, how_it_works, who_uses_it, app_link, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (team_id)
       DO UPDATE SET app_name = $3, description = $4, use_case = $5, how_it_works = $6, who_uses_it = $7, app_link = $8, updated_at = NOW()`,
      [input.presentation_id, input.team_id, input.app_name, input.description, input.use_case, input.how_it_works, input.who_uses_it, input.app_link ?? ""],
      { label: "Upsert hackathon submission" }
    );
    return { success: true };
  },
});
