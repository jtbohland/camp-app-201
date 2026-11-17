import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, getCounselorAccess, getSpeakerAccess, resolveViewCohort } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

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
  /** The speaker's reply. Stays visible after Q&A closes for cAMPers. */
  answer_text: z.string().nullable(),
  answered_at: z.string().nullable(),
});

export default api({
  name: "GetExecQuestions",
  description: "Gets questions for an executive with user vote status.",
  integrations: { camp_db: postgres(APPS_DB) },
  input: z.object({
    executive_id: z.coerce.number(),
    camper_id: z.coerce.number(),
  }),
  output: z.object({
    questions: z.array(QuestionSchema),
    /** True once the speaker's session has ended: questions still save, but earn no points. */
    session_ended: z.boolean(),
    session_ends_at: z.string().nullable(),
  }),
  async run(ctx, { executive_id, camper_id }) {
    const db = ctx.integrations.camp_db;
    // Only questions from the viewed cohort (active for cAMPers, chosen past cohort for counselors).
    const VIEW = cohortIdSql((await resolveViewCohort(db, ctx.user.email)).cohortId);

    // Guest speakers only see their own session's questions.
    const counselor = await getCounselorAccess(db, ctx.user.email);
    if (!counselor.isAdmin) {
      const speaker = await getSpeakerAccess(db, ctx.user.email);
      if (speaker && speaker.executiveId !== executive_id) {
        return { questions: [], session_ended: false, session_ends_at: null };
      }
    }
    const questions = await db.query(
      `SELECT q.id, q.executive_id, q.submitted_by,
              (c.first_name || ' ' || c.last_name) AS submitter_name,
              c.team_id AS submitter_team_id,
              q.question_text, COALESCE(tally.total, 0) AS vote_count, q.is_asked, q.is_locked, q.created_at,
              NULLIF(v.vote, 0) AS user_vote, q.answer_text, q.answered_at::text AS answered_at
       FROM camp201_exec_questions q
       JOIN camp201_campers c ON c.id = q.submitted_by
       LEFT JOIN LATERAL (SELECT SUM(ev.vote)::int AS total FROM camp201_exec_votes ev WHERE ev.question_id = q.id) tally ON true
       LEFT JOIN camp201_exec_votes v ON v.question_id = q.id AND v.voter_id = $2
       WHERE q.executive_id = $1 AND c.cohort_id = ${VIEW}
       ORDER BY COALESCE(tally.total, 0) DESC, q.created_at ASC
       LIMIT 50`,
      QuestionSchema,
      [executive_id, camper_id],
      { label: "Get exec questions" }
    );
    const [ends] = await db.query(
      `SELECT to_char(e AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS ends_at,
              COALESCE(e <= NOW(), false) AS ended
       FROM (SELECT camp201_qa_session_end($1) AS e) x`,
      z.object({ ends_at: z.string().nullable(), ended: z.boolean() }),
      [executive_id],
      { label: "When the speaker's session ends" }
    );
    return { questions, session_ended: ends?.ended ?? false, session_ends_at: ends?.ends_at ?? null };
  },
});
