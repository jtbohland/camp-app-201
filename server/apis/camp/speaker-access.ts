import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getCounselorAccess, getSpeakerAccess, requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/** Counselor copied a speaker's share link: clears the "Not shared yet" pill. */
export const MarkSpeakerLinkCopied = api({
  name: "MarkSpeakerLinkCopied",
  description: "Records that a counselor copied a guest speaker's share link",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ executive_id: z.number() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { executive_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await db.execute(
      `UPDATE camp201_executives SET link_copied_at = COALESCE(link_copied_at, NOW()) WHERE id = $1`,
      [executive_id],
      { label: "Mark speaker link copied" }
    );
    return { success: true };
  },
});

/**
 * The speaker (or a counselor) replies to a question and/or marks it answered.
 * Works even after Q&A is locked for cAMPers, and replies stay visible afterward.
 */
export const AnswerExecQuestion = api({
  name: "AnswerExecQuestion",
  description: "Lets a guest speaker or counselor reply to and mark a Q&A question answered",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    question_id: z.number(),
    /** Reply text. Null keeps the current reply; an empty string removes it. */
    answer_text: z.string().max(4000).nullable(),
    is_answered: z.boolean(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { question_id, answer_text, is_answered }) {
    const db = ctx.integrations.camp_201_db;
    const email = (ctx.user.email ?? "").toLowerCase();

    const rows = await db.query(
      `SELECT executive_id FROM camp201_exec_questions WHERE id = $1 LIMIT 1`,
      z.object({ executive_id: z.coerce.number() }),
      [question_id],
      { label: "Find question" }
    );
    if (!rows[0]) throw new Error("This question no longer exists.");

    // Only this question's speaker, or a counselor, can answer it.
    const counselor = await getCounselorAccess(db, email);
    if (!counselor.isAdmin) {
      const speaker = await getSpeakerAccess(db, email);
      if (!speaker || speaker.executiveId !== rows[0].executive_id) {
        throw new Error("Only this session's speaker or a counselor can answer.");
      }
    }

    await db.execute(
      `UPDATE camp201_exec_questions SET
         is_asked = $2,
         answer_text = CASE WHEN $3::text IS NULL THEN answer_text ELSE NULLIF(btrim($3::text), '') END,
         answered_at = CASE
           WHEN $3::text IS NOT NULL AND NULLIF(btrim($3::text), '') IS NOT NULL THEN NOW()
           WHEN $3::text IS NOT NULL THEN NULL
           ELSE answered_at END,
         answered_by = CASE WHEN $3::text IS NOT NULL THEN $4 ELSE answered_by END
       WHERE id = $1`,
      [question_id, is_answered, answer_text, ctx.user.name ?? email],
      { label: "Save speaker answer" }
    );
    return { success: true };
  },
});
