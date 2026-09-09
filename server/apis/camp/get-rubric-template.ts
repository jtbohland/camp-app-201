import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetRubricTemplate",
  description: "Gets a rubric template with its criteria and any existing scores",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    rubric_template_id: z.number(),
  }),
  output: z.object({
    template: z.any(),
    scores: z.array(z.any()),
  }),
  async run(ctx, { rubric_template_id }) {
    const templates = await ctx.integrations.apps_database.query(
      `SELECT id, name, description, criteria, max_total_points, points_to_award
       FROM camp201_rubric_templates WHERE id = $1 LIMIT 1`,
      z.object({
        id: z.coerce.number(), name: z.string(), description: z.string().nullable(),
        criteria: z.any(), max_total_points: z.coerce.number(), points_to_award: z.coerce.number(),
      }),
      [rubric_template_id],
      { label: "Get rubric template" }
    );

    if (templates.length === 0) {
      return { template: null, scores: [] };
    }

    const template = templates[0];
    template.criteria = typeof template.criteria === "string" ? JSON.parse(template.criteria) : template.criteria;

    // Get existing scores for this rubric
    const scores = await ctx.integrations.apps_database.query(
      `SELECT rs.id, rs.team_id, t.name AS team_name, rs.scores, rs.total_score, rs.max_score, rs.notes
       FROM camp201_rubric_scores rs
       JOIN camp201_teams t ON t.id = rs.team_id
       WHERE rs.template_id = $1
       ORDER BY rs.total_score DESC LIMIT 20`,
      z.object({
        id: z.coerce.number(), team_id: z.coerce.number(), team_name: z.string(),
        scores: z.any(), total_score: z.coerce.number(), max_score: z.coerce.number(), notes: z.string().nullable(),
      }),
      [rubric_template_id],
      { label: "Get existing scores" }
    );

    return { template, scores };
  },
});
