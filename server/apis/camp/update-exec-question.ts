import { api, z, postgres } from "@superblocksteam/sdk-api";
import { isCampClosed } from "../../lib/camp-closed-guard.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/** A cAMPer edits the wording of their own speaker question (until the speaker answers it). */
export default api({
  name: "UpdateExecQuestion",
  description: "cAMPer edits their own Q&A question",
  integrations: { camp_db: postgres(APPS_DB) },
  input: z.object({
    question_id: z.coerce.number().int().positive(),
    question_text: z.string().trim().min(5, "Questions need at least 5 characters").max(1000),
  }),
  output: z.object({ success: z.boolean(), question_text: z.string() }),
  async run(ctx, { question_id, question_text }) {
    const db = ctx.integrations.camp_db;
    const email = (ctx.user.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("You must be signed in.");
    if (await isCampClosed(db)) throw new Error("cAMP is closed. Q&A can't be changed.");

    const rows = await db.query(
      `SELECT q.id, q.is_asked,
              (lower(c.email) = $2) AS mine,
              COALESCE((SELECT g.is_locked FROM camp201_feature_gates g WHERE g.feature_key = 'exec_qa' LIMIT 1), false) AS qa_locked
       FROM camp201_exec_questions q JOIN camp201_campers c ON c.id = q.submitted_by
       WHERE q.id = $1 LIMIT 1`,
      z.object({ id: z.coerce.number(), is_asked: z.boolean().nullable(), mine: z.boolean(), qa_locked: z.boolean() }),
      [question_id, email],
      { label: "Load question" }
    );
    const q = rows[0];
    if (!q) throw new Error("That question no longer exists.");
    if (!q.mine) throw new Error("You can only edit your own questions.");
    if (q.qa_locked) throw new Error("Q&A is closed right now, so questions can't be edited.");
    if (q.is_asked) throw new Error("The speaker already answered this one, so it can't be edited.");

    await db.query(
      `WITH u AS (UPDATE camp201_exec_questions SET question_text = $2 WHERE id = $1 RETURNING id) SELECT id FROM u LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [question_id, question_text],
      { label: "Update question text" }
    );
    return { success: true, question_text };
  },
});
