import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";
const POINTS_PER_QUESTION = 2;
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

    // Award points
    await ctx.integrations.camp_db.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by) VALUES ($1, $2, $3, $4)`,
      [camper_id, POINTS_PER_QUESTION, `Submitted Q&A question (exec #${executive_id})`, camper_id],
      { label: "Award question points" }
    );
    await ctx.integrations.camp_db.execute(
      `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
      [POINTS_PER_QUESTION, camper_id],
      { label: "Update camper points" }
    );

    return { success: true, id };
  },
});
