import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "CreateSurvey",
  description: "Creates a new end-of-day survey for the active cohort",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    title: z.string(),
    description: z.string().nullable(),
    questions: z.array(z.object({
      id: z.string(),
      text: z.string(),
      type: z.enum(["rating", "text", "multiple_choice"]),
      options: z.array(z.string()).optional(),
    })),
    day_number: z.number(),
    points_per_completion: z.number(),
    team_bonus_points: z.number(),
    created_by: z.number(),
  }),
  output: z.object({ success: z.boolean(), survey_id: z.number() }),
  async run(ctx, input) {
    const CohortSchema = z.object({ id: z.coerce.number() });
    const cohort = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortSchema,
      undefined,
      { label: "Get active cohort" }
    );
    const cohortId = cohort.length > 0 ? cohort[0].id : null;

    // Deactivate any other active surveys
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_surveys SET is_active = false WHERE is_active = true`,
      undefined,
      { label: "Deactivate previous surveys" }
    );

    const InsertSchema = z.object({ id: z.coerce.number() });
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_surveys (title, description, questions, day_number, is_active, points_per_completion, team_bonus_points, cohort_id, created_by)
       VALUES ($1, $2, $3::jsonb, $4, true, $5, $6, $7, $8)
       RETURNING id`,
      InsertSchema,
      [input.title, input.description, JSON.stringify(input.questions), input.day_number, input.points_per_completion, input.team_bonus_points, cohortId, input.created_by],
      { label: "Create survey" }
    );

    return { success: true, survey_id: result[0].id };
  },
});
