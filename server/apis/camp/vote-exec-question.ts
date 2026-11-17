import { api, z, postgres } from "@superblocksteam/sdk-api";
import { isCampClosed } from "../../lib/camp-closed-guard.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/**
 * Up/down vote a speaker Q&A question. cAMPers can vote on as many questions as they like (one vote
 * per question). Clicking the same vote again takes it back. The voter is always the signed-in user,
 * so a stale or missing camper id on the page can never make a vote fail.
 */
export default api({
  name: "VoteExecQuestion",
  description: "Toggle a vote on any number of Q&A questions",
  integrations: { camp_db: postgres(APPS_DB) },
  input: z.object({
    question_id: z.coerce.number().int().positive(),
    /** 1 = upvote, -1 = downvote, 0 = take my vote back */
    vote: z.number().int().min(-1).max(1),
  }),
  output: z.object({
    success: z.boolean(),
    message: z.string().optional(),
    vote_count: z.number(),
    user_vote: z.number(),
  }),
  async run(ctx, { question_id, vote }) {
    const db = ctx.integrations.camp_db;
    const email = (ctx.user.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("You must be signed in to vote.");
    if (await isCampClosed(db)) throw new Error("cAMP is closed. Voting is over.");

    const info = await db.query(
      `SELECT me.id AS voter_id, me.team_id AS voter_team,
              q.submitted_by, author.team_id AS author_team,
              COALESCE((SELECT g.is_locked FROM camp201_feature_gates g WHERE g.feature_key = 'exec_qa' LIMIT 1), false) AS qa_locked
       FROM camp201_campers me
       CROSS JOIN camp201_exec_questions q
       JOIN camp201_campers author ON author.id = q.submitted_by
       WHERE lower(me.email) = $1 AND q.id = $2
       LIMIT 1`,
      z.object({
        voter_id: z.coerce.number(),
        voter_team: z.coerce.number().nullable(),
        submitted_by: z.coerce.number(),
        author_team: z.coerce.number().nullable(),
        qa_locked: z.boolean(),
      }),
      [email, question_id],
      { label: "Load voter and question" }
    );
    const row = info[0];
    if (!row) throw new Error("That question no longer exists.");
    if (row.qa_locked) throw new Error("Q&A is closed right now.");
    if (row.submitted_by === row.voter_id) throw new Error("You can't vote on your own question.");
    if (row.voter_team !== null && row.voter_team === row.author_team) {
      throw new Error("You can't vote on a teammate's question.");
    }

    // Save the vote and recount in one statement (a vote of 0 = taken back).
    const saved = await db.query(
      `WITH up AS (
         INSERT INTO camp201_exec_votes (question_id, voter_id, vote)
         VALUES ($1, $2, $3)
         ON CONFLICT (question_id, voter_id) DO UPDATE SET vote = EXCLUDED.vote
         RETURNING vote
       ),
       recount AS (
         UPDATE camp201_exec_questions q
         SET vote_count = (
           SELECT COALESCE(SUM(v.vote), 0) FROM camp201_exec_votes v
           WHERE v.question_id = $1 AND v.voter_id <> $2
         ) + (SELECT vote FROM up)
         WHERE q.id = $1
         RETURNING q.vote_count
       )
       SELECT (SELECT vote FROM up) AS user_vote,
              (SELECT vote_count FROM recount) AS vote_count`,
      z.object({ user_vote: z.coerce.number(), vote_count: z.coerce.number() }),
      [question_id, row.voter_id, vote],
      { label: "Save vote + recount" }
    );
    const result = saved[0];
    return { success: true, vote_count: result.vote_count, user_vote: result.user_vote };
  },
});
