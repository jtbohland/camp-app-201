import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SavePresentationResponses",
  description: "Saves a camper's responses for a presentation workspace (upsert)",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    presentation_id: z.number(),
    camper_id: z.number(),
    responses: z.string(), // JSON string of {q_key: answer}
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { presentation_id, camper_id, responses }) {
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_presentation_responses (presentation_id, camper_id, responses, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (presentation_id, camper_id)
       DO UPDATE SET responses = $3::jsonb, updated_at = NOW()`,
      [presentation_id, camper_id, responses],
      { label: "Upsert presentation responses" }
    );
    return { success: true };
  },
});
