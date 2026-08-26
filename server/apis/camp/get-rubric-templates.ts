import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const CriterionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  max_score: z.number(),
});

const TemplateSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  description: z.string().nullable(),
  criteria: z.array(CriterionSchema),
  max_total_points: z.coerce.number(),
  points_to_award: z.coerce.number(),
});

export default api({
  name: "GetRubricTemplates",
  description: "Gets all rubric templates for the active cohort",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    templates: z.array(TemplateSchema),
  }),
  async run(ctx) {
    const RawSchema = z.object({
      id: z.coerce.number(),
      name: z.string(),
      description: z.string().nullable(),
      criteria: z.any(),
      max_total_points: z.coerce.number(),
      points_to_award: z.coerce.number(),
    });

    const raw = await ctx.integrations.apps_database.query(
      `SELECT id, name, description, criteria, max_total_points, points_to_award
       FROM camp201_rubric_templates
       ORDER BY created_at DESC LIMIT 20`,
      RawSchema,
      undefined,
      { label: "Get rubric templates" }
    );

    const templates = raw.map((t) => ({
      ...t,
      criteria: Array.isArray(t.criteria) ? t.criteria : JSON.parse(String(t.criteria)),
    }));

    return { templates };
  },
});
