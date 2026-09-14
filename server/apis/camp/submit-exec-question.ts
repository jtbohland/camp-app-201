import { api, z, postgres } from "@superblocksteam/sdk-api";
import { awardRepeatableBadge } from "../../lib/award-badge.js";
import { BADGE_IDS } from "../../lib/accelerator.js";
import { isCampClosed } from "../../lib/camp-closed-guard.js";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";
const MAX_QUESTIONS = 5;

export default api({
  name: "SubmitExecQuestion",
  description: "Submits a question for an executive session with points.",
  integrations: { camp_db: postgres(APPS_DB) },
  input: z.object({
    executive_id: z.coerce.number(),
    camper_id: z.coerce.number(),
    question_text: z.string().min(5),
  }),
  output: z.object({ success: z.boolean(), id: z.coerce.number().optional(), message: z.string().optional() }),
  async run(ctx, { executive_id, camper_id, question_text }) {
    if (await isCampClosed(ctx.integrations.camp_db)) {
      throw new Error("cAMP is closed — Q&A is no longer accepted.");
    }

    // Check exec_qa feature gate
    const gateResult = await ctx.integrations.camp_db.query(
      `SELECT is_locked FROM camp201_feature_gates WHERE feature_key = 'exec_qa' LIMIT 1`,
      z.object({ is_locked: z.boolean() }), undefined,
      { label: "Check exec_qa gate" }
    );
    if (gateResult.length > 0 && gateResult[0].is_locked) {
      return { success: false, message: "Executive Q&A is currently locked by your counselor." };
    }

    // Check max questions per session
    const CountSchema = z.object({ count: z.coerce.number() });
    const [{ count }] = await ctx.integrations.camp_db.query(
      `SELECT COUNT(*)::int AS count FROM camp201_exec_questions WHERE executive_id = $1 AND submitted_by = $2`,
      CountSchema, [executive_id, camper_id],
      { label: "Count user questions" }
    );
    if (count >= MAX_QUESTIONS) {
      return { success: false, message: `Max ${MAX_QUESTIONS} questions per session reached` };
    }

    // Insert question
    const IdSchema = z.object({ id: z.coerce.number() });
    const [{ id }] = await ctx.integrations.camp_db.query(
      `INSERT INTO camp201_exec_questions (executive_id, submitted_by, question_text) VALUES ($1, $2, $3) RETURNING id`,
      IdSchema, [executive_id, camper_id, question_text],
      { label: "Insert exec question" }
    );

    // Award accelerated Q&A badge
    await awardRepeatableBadge(
      ctx.integrations.camp_db,
      camper_id,
      BADGE_IDS.QA_CONTRIBUTOR,
      `Submitted Q&A question (exec #${executive_id})`,
    );

    return { success: true, id };
  },
});
