import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const KEY_RE = /^s\d{1,3}_q\d{1,3}$/;
const MAX_ANSWER = 5000;

/**
 * Saves ONE answer in a cAMPer's own presentation workspace ("My answers"). Only that question changes,
 * so saving one box can never wipe out another. The cAMPer is always the signed-in user.
 */
export default api({
  name: "SavePresentationResponses",
  description: "Saves one answer in a cAMPer's presentation workspace",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    presentation_id: z.number(),
    question_key: z.string(),
    answer: z.string(),
  }),
  output: z.object({ success: z.boolean(), saved_at: z.string() }),
  async run(ctx, { presentation_id, question_key, answer }) {
    const db = ctx.integrations.camp_201_db;
    if (!KEY_RE.test(question_key)) throw new Error("Unknown question.");
    if (answer.length > MAX_ANSWER) throw new Error(`Answers can be up to ${MAX_ANSWER} characters.`);
    const email = (ctx.user.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("You must be signed in.");

    const me = await db.query(
      `SELECT id FROM camp201_campers WHERE lower(email) = $1 ORDER BY id DESC LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [email],
      { label: "Find signed-in camper" }
    );
    const camperId = me[0]?.id;
    if (!camperId) throw new Error("You need a cAMP profile to save answers.");

    // Merge just this one answer into the cAMPer's row (creates the row the first time).
    const rows = await db.query(
      `WITH up AS (
         INSERT INTO camp201_presentation_responses (presentation_id, camper_id, responses, updated_at)
         VALUES ($1, $2, jsonb_build_object($3::text, $4::text), NOW())
         ON CONFLICT (presentation_id, camper_id) DO UPDATE SET
           responses = COALESCE(camp201_presentation_responses.responses, '{}'::jsonb) || jsonb_build_object($3::text, $4::text),
           updated_at = NOW()
         RETURNING updated_at
       )
       SELECT to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS saved_at FROM up`,
      z.object({ saved_at: z.string() }),
      [presentation_id, camperId, question_key, answer],
      { label: "Save one answer" }
    );
    return { success: true, saved_at: rows[0]?.saved_at ?? new Date().toISOString() };
  },
});
