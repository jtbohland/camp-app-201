import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ScoreRecordSchema = z.object({
  id: z.coerce.number(),
  template_name: z.string(),
  team_name: z.string(),
  scored_by_name: z.string(),
  total_score: z.coerce.number(),
  max_score: z.coerce.number(),
  points_awarded: z.coerce.number(),
  notes: z.string().nullable(),
  created_at: z.string(),
});

export default api({
  name: "GetRubricScores",
  description: "Gets rubric score history for admin view",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    team_id: z.number().nullable(),
    cohort_id: z.number().nullable(),
  }),
  output: z.object({
    scores: z.array(ScoreRecordSchema),
  }),
  async run(ctx, { team_id, cohort_id }) {
    let effectiveCohortId = cohort_id;
    if (!effectiveCohortId) {
      const ActiveSchema = z.object({ id: z.coerce.number() });
      const active = await ctx.integrations.apps_database.query(
        `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
        ActiveSchema,
        undefined,
        { label: "Get active cohort" }
      );
      effectiveCohortId = active.length > 0 ? active[0].id : null;
    }

    let whereClause = "WHERE 1=1";
    const params: (number | null)[] = [];
    let paramIndex = 1;

    if (effectiveCohortId) {
      whereClause += ` AND rs.cohort_id = $${paramIndex}`;
      params.push(effectiveCohortId);
      paramIndex++;
    }
    if (team_id) {
      whereClause += ` AND rs.team_id = $${paramIndex}`;
      params.push(team_id);
      paramIndex++;
    }

    const scores = await ctx.integrations.apps_database.query(
      `SELECT rs.id, rt.name as template_name, t.name as team_name,
              CONCAT(c.first_name, ' ', c.last_name) as scored_by_name,
              rs.total_score, rs.max_score, rs.points_awarded, rs.notes, rs.created_at
       FROM camp201_rubric_scores rs
       JOIN camp201_rubric_templates rt ON rt.id = rs.template_id
       JOIN camp201_teams t ON t.id = rs.team_id
       JOIN camp201_campers c ON c.id = rs.scored_by
       ${whereClause}
       ORDER BY rs.created_at DESC LIMIT 50`,
      ScoreRecordSchema,
      params.length > 0 ? params : undefined,
      { label: "Get rubric scores" }
    );

    return { scores };
  },
});
