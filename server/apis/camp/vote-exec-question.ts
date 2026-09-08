import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";
const POINTS_PER_VOTE_RECEIVED = 1;

export default api({
  name: "VoteExecQuestion",
  description: "Upvote or downvote a question with team/self restrictions.",
  integrations: { camp_db: postgres(APPS_DB) },
  input: z.object({
    question_id: z.coerce.number(),
    voter_id: z.coerce.number(),
    vote: z.number().min(-1).max(1),
  }),
  output: z.object({ success: z.boolean(), message: z.string().optional() }),
  async run(ctx, { question_id, voter_id, vote }) {
    // Get question + submitter info
    const QSchema = z.object({ submitted_by: z.coerce.number(), submitter_team_id: z.coerce.number().nullable() });
    const questions = await ctx.integrations.camp_db.query(
      `SELECT q.submitted_by, c.team_id AS submitter_team_id
       FROM camp201_exec_questions q JOIN camp201_campers c ON c.id = q.submitted_by
       WHERE q.id = $1 LIMIT 1`,
      QSchema, [question_id],
      { label: "Get question submitter" }
    );
    if (questions.length === 0) return { success: false, message: "Question not found" };

    const { submitted_by, submitter_team_id } = questions[0];

    // Can't vote your own
    if (submitted_by === voter_id) return { success: false, message: "Can't vote on your own question" };

    // Can't vote if same team
    const VoterSchema = z.object({ team_id: z.coerce.number().nullable() });
    const [voter] = await ctx.integrations.camp_db.query(
      `SELECT team_id FROM camp201_campers WHERE id = $1 LIMIT 1`,
      VoterSchema, [voter_id],
      { label: "Get voter team" }
    );
    if (voter.team_id && voter.team_id === submitter_team_id) {
      return { success: false, message: "Can't vote for a teammate's question" };
    }

    // Upsert vote
    await ctx.integrations.camp_db.execute(
      `INSERT INTO camp201_exec_votes (question_id, voter_id, vote) VALUES ($1, $2, $3)
       ON CONFLICT (question_id, voter_id) DO UPDATE SET vote = $3`,
      [question_id, voter_id, vote],
      { label: "Upsert vote" }
    );

    // Recalculate vote_count
    const SumSchema = z.object({ total: z.coerce.number() });
    const [{ total }] = await ctx.integrations.camp_db.query(
      `SELECT COALESCE(SUM(vote), 0)::int AS total FROM camp201_exec_votes WHERE question_id = $1`,
      SumSchema, [question_id],
      { label: "Sum votes" }
    );
    await ctx.integrations.camp_db.execute(
      `UPDATE camp201_exec_questions SET vote_count = $1 WHERE id = $2`,
      [total, question_id],
      { label: "Update vote count" }
    );

    // Award point to question submitter for positive votes
    if (vote === 1) {
      await ctx.integrations.camp_db.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by) VALUES ($1, $2, $3, $4)`,
        [submitted_by, POINTS_PER_VOTE_RECEIVED, `Vote received on Q&A question`, voter_id],
        { label: "Award vote points" }
      );
      await ctx.integrations.camp_db.execute(
        `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
        [POINTS_PER_VOTE_RECEIVED, submitted_by],
        { label: "Update submitter points" }
      );
    }

    return { success: true };
  },
});
