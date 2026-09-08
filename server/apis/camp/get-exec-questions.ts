import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const QuestionSchema = z.object({
  id: z.coerce.number(),
  executive_id: z.coerce.number(),
  submitted_by: z.coerce.number(),
  submitter_name: z.string().nullable(),
  submitter_team_id: z.coerce.number().nullable(),
  question_text: z.string(),
  vote_count: z.coerce.number(),
  is_asked: z.boolean(),
  is_locked: z.boolean(),
  created_at: z.string(),
  user_vote: z.coerce.number().nullable(),
});

export default api({
  name: "GetExecQuestions",
  description: "Gets questions for an executive with user vote status.",
  integrations: { camp_db: postgres(APPS_DB) },
  input: z.object({
    executive_id: z.coerce.number(),
    camper_id: z.coerce.number(),
  }),
  output: z.object({ questions: z.array(QuestionSchema) }),
  async run(ctx, { executive_id, camper_id }) {
    const questions = await ctx.integrations.camp_db.query(
      `SELECT q.id, q.executive_id, q.submitted_by,
              (c.first_name || ' ' || c.last_name) AS submitter_name,
              c.team_id AS submitter_team_id,
              q.question_text, q.vote_count, q.is_asked, q.is_locked, q.created_at,
              v.vote AS user_vote
       FROM camp201_exec_questions q
       JOIN camp201_campers c ON c.id = q.submitted_by
       LEFT JOIN camp201_exec_votes v ON v.question_id = q.id AND v.voter_id = $2
       WHERE q.executive_id = $1
       ORDER BY q.vote_count DESC, q.created_at ASC
       LIMIT 50`,
      QuestionSchema,
      [executive_id, camper_id],
      { label: "Get exec questions" }
    );
    return { questions };
  },
});
