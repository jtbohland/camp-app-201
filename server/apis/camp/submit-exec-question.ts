import { api, z, postgres } from "@superblocksteam/sdk-api";
import { awardRepeatableBadge } from "../../lib/award-badge.js";
import { BADGE_IDS } from "../../lib/accelerator.js";
import { isCampClosed } from "../../lib/camp-closed-guard.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";
const MAX_QUESTIONS = 5;

/**
 * Submits a speaker Q&A question. Points: +2 while the speaker's session is live (+1 more per
 * upvote, added as votes come in). Asked after the session ended: saved for the speaker, no points.
 */
export default api({
  name: "SubmitExecQuestion",
  description: "Submits a speaker Q&A question; +2 pts only while the session is live",
  integrations: { camp_db: postgres(APPS_DB) },
  input: z.object({
    executive_id: z.coerce.number(),
    camper_id: z.coerce.number(),
    question_text: z.string().min(5),
  }),
  output: z.object({
    success: z.boolean(),
    id: z.coerce.number().optional(),
    message: z.string().optional(),
    points: z.number().optional(),
    session_ended: z.boolean().optional(),
  }),
  async run(ctx, { executive_id, camper_id, question_text }) {
    const db = ctx.integrations.camp_db;
    if (await isCampClosed(db)) {
      throw new Error("cAMP is closed — Q&A is no longer accepted.");
    }

    const gateResult = await db.query(
      `SELECT is_locked FROM camp201_feature_gates WHERE feature_key = 'exec_qa' LIMIT 1`,
      z.object({ is_locked: z.boolean() }), undefined,
      { label: "Check exec_qa gate" }
    );
    if (gateResult.length > 0 && gateResult[0].is_locked) {
      return { success: false, message: "Executive Q&A is currently locked by your counselor." };
    }

    const [{ count }] = await db.query(
      `SELECT COUNT(*)::int AS count FROM camp201_exec_questions WHERE executive_id = $1 AND submitted_by = $2`,
      z.object({ count: z.coerce.number() }), [executive_id, camper_id],
      { label: "Count user questions" }
    );
    if (count >= MAX_QUESTIONS) {
      return { success: false, message: `Max ${MAX_QUESTIONS} questions per session reached` };
    }

    // Save the question, then award by the Q&A rules (0 if the session already ended).
    const [saved] = await db.query(
      `WITH ins AS (
         INSERT INTO camp201_exec_questions (executive_id, submitted_by, question_text)
         VALUES ($1, $2, $3) RETURNING id
       )
       SELECT ins.id,
              COALESCE(camp201_qa_session_end($1) <= NOW(), false) AS session_ended
       FROM ins`,
      z.object({ id: z.coerce.number(), session_ended: z.boolean() }),
      [executive_id, camper_id, question_text],
      { label: "Insert exec question" }
    );
    const [{ pts }] = await db.query(
      `SELECT camp201_sync_qa_question_points($1)::int AS pts`,
      z.object({ pts: z.coerce.number() }),
      [saved.id],
      { label: "Award Q&A points" }
    );

    // Badge still counts every question; points come only from the rule above.
    await awardRepeatableBadge(
      db,
      camper_id,
      BADGE_IDS.QA_CONTRIBUTOR,
      `Submitted Q&A question (exec #${executive_id})`,
      null,
      0,
    );

    return { success: true, id: saved.id, points: pts, session_ended: saved.session_ended };
  },
});
