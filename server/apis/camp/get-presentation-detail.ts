import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const FeedbackSchema = z.object({
  id: z.coerce.number(),
  presentation_id: z.coerce.number(),
  submitted_by: z.coerce.number(),
  submitter_name: z.string().nullable(),
  rating: z.coerce.number().nullable(),
  strengths: z.string().nullable(),
  improvements: z.string().nullable(),
  comment: z.string().nullable(),
  created_at: z.string(),
});

const ScoreSchema = z.object({
  id: z.coerce.number(),
  criterion: z.string(),
  max_points: z.coerce.number(),
  score: z.coerce.number().nullable(),
  notes: z.string().nullable(),
  scored_by: z.coerce.number().nullable(),
});

export default api({
  name: "GetPresentationDetail",
  description: "Gets a single presentation with feedback and scores.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    presentation_id: z.number(),
  }),
  output: z.object({
    feedback: z.array(FeedbackSchema),
    scores: z.array(ScoreSchema),
  }),
  async run(ctx, { presentation_id }) {
    const feedback = await ctx.integrations.camp_db.query(
      `SELECT f.id, f.presentation_id, f.submitted_by, f.rating, f.strengths,
              f.improvements, f.comment, f.created_at,
              CONCAT(c.first_name, ' ', c.last_name) AS submitter_name
       FROM camp201_presentation_feedback f
       LEFT JOIN camp201_campers c ON c.id = f.submitted_by
       WHERE f.presentation_id = $1
       ORDER BY f.created_at DESC
       LIMIT 50`,
      FeedbackSchema,
      [presentation_id],
      { label: "Get presentation feedback" }
    );

    const scores = await ctx.integrations.camp_db.query(
      `SELECT id, criterion, max_points, score, notes, scored_by
       FROM camp201_presentation_scores
       WHERE presentation_id = $1
       ORDER BY id
       LIMIT 50`,
      ScoreSchema,
      [presentation_id],
      { label: "Get presentation scores" }
    );

    return { feedback, scores };
  },
});
