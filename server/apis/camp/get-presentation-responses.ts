import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetPresentationResponses",
  description: "Gets a camper's saved responses for a presentation workspace",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    presentation_id: z.number(),
    camper_id: z.number(),
  }),
  output: z.object({
    responses: z.record(z.string(), z.string()),
    hasResponses: z.boolean(),
  }),
  async run(ctx, { presentation_id, camper_id }) {
    const rows = await ctx.integrations.apps_database.query(
      `SELECT responses FROM camp201_presentation_responses
       WHERE presentation_id = $1 AND camper_id = $2 LIMIT 1`,
      z.object({ responses: z.any() }),
      [presentation_id, camper_id],
      { label: "Get presentation responses" }
    );

    if (rows.length === 0) {
      return { responses: {}, hasResponses: false };
    }

    const resp = rows[0].responses;
    const parsed = typeof resp === "string" ? JSON.parse(resp) : resp;
    return { responses: parsed as Record<string, string>, hasResponses: true };
  },
});
