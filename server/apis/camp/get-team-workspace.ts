import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetTeamWorkspace",
  description: "Gets the shared team workspace responses for a presentation",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    team_id: z.number(),
  }),
  output: z.object({
    responses: z.record(z.string(), z.string()),
    last_edited_by: z.number().nullable(),
    hasResponses: z.boolean(),
  }),
  async run(ctx, { presentation_id, team_id }) {
    const rows = await ctx.integrations.camp_201_db.query(
      `SELECT responses, last_edited_by FROM camp201_team_workspace
       WHERE presentation_id = $1 AND team_id = $2 LIMIT 1`,
      z.object({ responses: z.any(), last_edited_by: z.coerce.number().nullable() }),
      [presentation_id, team_id],
      { label: "Get team workspace" }
    );

    if (rows.length === 0) {
      return { responses: {}, last_edited_by: null, hasResponses: false };
    }

    const resp = rows[0].responses;
    const parsed = typeof resp === "string" ? JSON.parse(resp) : resp;
    return { responses: parsed as Record<string, string>, last_edited_by: rows[0].last_edited_by, hasResponses: true };
  },
});
