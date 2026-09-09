import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const PresentationSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  description: z.string().nullable(),
  instructions: z.string().nullable(),
  resources: z.any(),
  prep_time_minutes: z.coerce.number().nullable(),
  present_time_minutes: z.coerce.number().nullable(),
  team_id: z.coerce.number().nullable(),
  team_name: z.string().nullable(),
  day_number: z.coerce.number().nullable(),
  status: z.string(),
  sort_order: z.coerce.number(),
  is_locked: z.boolean(),
  rubric_template_id: z.coerce.number().nullable(),
  deck_template_url: z.string().nullable(),
  questions: z.any(),
  created_at: z.string(),
  feedback_count: z.coerce.number(),
  avg_rating: z.string().nullable(),
});

export default api({
  name: "GetPresentations",
  description: "Fetches all presentations with feedback stats, lock state, and rubric/deck info",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    status: z.string().nullable(),
  }),
  output: z.object({
    presentations: z.array(PresentationSchema),
  }),
  async run(ctx, { status }) {
    const presentations = await ctx.integrations.camp_db.query(
      `SELECT p.id, p.title, p.description, p.instructions, p.resources,
              p.prep_time_minutes, p.present_time_minutes, p.team_id,
              t.name AS team_name, p.day_number, p.status, p.sort_order,
              COALESCE(p.is_locked, true) AS is_locked,
              p.rubric_template_id, p.deck_template_url, COALESCE(p.questions, '[]'::jsonb) AS questions,
              p.created_at,
              COALESCE(fb.cnt, 0) AS feedback_count,
              fb.avg_rating
       FROM camp201_presentations p
       LEFT JOIN camp201_teams t ON t.id = p.team_id
       LEFT JOIN (
         SELECT presentation_id, COUNT(*) AS cnt, ROUND(AVG(rating), 1)::text AS avg_rating
         FROM camp201_presentation_feedback
         GROUP BY presentation_id
       ) fb ON fb.presentation_id = p.id
       WHERE ($1::text IS NULL OR p.status = $1)
       ORDER BY p.sort_order, p.day_number, p.id
       LIMIT 50`,
      PresentationSchema,
      [status],
      { label: "Get all presentations" }
    );

    return { presentations };
  },
});
