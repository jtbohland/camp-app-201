import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertPresentationUnlocked, resolveHubViewer } from "../../lib/team-hub.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const KEY_RE = /^s\d{1,3}_q\d{1,3}$/;
const MAX_ANSWER = 5000;

/**
 * Saves ONE answer in the shared team workspace. Only that question changes in the database, so teammates
 * working on other questions at the same time never overwrite each other.
 * If `expected_saved_at` is given and someone else saved this question after that, the save is refused
 * (status "conflict") and their version is returned so nobody's work is silently lost.
 */
export default api({
  name: "SaveTeamWorkspace",
  description: "Saves one answer in a team's shared workspace",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    team_id: z.number(),
    question_key: z.string(),
    answer: z.string(),
    /** When this person last loaded this answer (null = they never saw a saved version). */
    expected_saved_at: z.string().nullable(),
    /** Save anyway even if a teammate changed it (after the user chose "Use mine"). */
    force: z.boolean(),
  }),
  output: z.object({
    status: z.enum(["saved", "conflict"]),
    saved_at: z.string().nullable(),
    saved_by_name: z.string().nullable(),
    /** The teammate's version when status is "conflict". */
    current_answer: z.string().nullable(),
  }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    if (!KEY_RE.test(input.question_key)) throw new Error("Unknown question.");
    if (input.answer.length > MAX_ANSWER) throw new Error(`Answers can be up to ${MAX_ANSWER} characters.`);

    // Who's saving comes from sign-in, never from the browser.
    const viewer = await resolveHubViewer(db, ctx.user.email, input.team_id);
    if (!viewer.isMember && !viewer.isCounselor) throw new Error("Only this team can edit its workspace.");
    if (viewer.camperId === null) throw new Error("You need a cAMP profile to edit the workspace.");
    await assertPresentationUnlocked(db, { presentationId: input.presentation_id }, viewer.isCounselor);

    const Meta = z.object({
      answer: z.string().nullable(),
      saved_at: z.string().nullable(),
      saved_by_name: z.string().nullable(),
    });
    const readCurrent = async () => {
      const rows = await db.query(
        `SELECT w.responses ->> $3::text AS answer,
                w.answer_meta -> $3::text ->> 'at' AS saved_at,
                NULLIF(trim(concat(c.first_name, ' ', c.last_name)), '') AS saved_by_name
         FROM camp201_team_workspace w
         LEFT JOIN camp201_campers c ON c.id = NULLIF(w.answer_meta -> $3::text ->> 'by', '')::int
         WHERE w.presentation_id = $1 AND w.team_id = $2 LIMIT 1`,
        Meta,
        [input.presentation_id, input.team_id, input.question_key],
        { label: "Read this answer" }
      );
      return rows[0] ?? { answer: null, saved_at: null, saved_by_name: null };
    };

    if (!input.force) {
      const current = await readCurrent();
      const changedSince =
        current.saved_at !== null &&
        (input.expected_saved_at === null || Date.parse(current.saved_at) > Date.parse(input.expected_saved_at));
      const differs = (current.answer ?? "").trim() !== input.answer.trim();
      if (changedSince && differs && (current.answer ?? "").trim() !== "") {
        return { status: "conflict" as const, ...current, current_answer: current.answer };
      }
    }

    // Merge just this one answer into the team's row (creates the row the first time).
    const nowIso = new Date().toISOString();
    await db.query(
      `WITH up AS (
         INSERT INTO camp201_team_workspace (presentation_id, team_id, responses, answer_meta, last_edited_by, updated_at)
         VALUES ($1, $2, jsonb_build_object($3::text, $4::text),
                 jsonb_build_object($3::text, jsonb_build_object('by', $5::int, 'at', $6::text)), $5, NOW())
         ON CONFLICT (presentation_id, team_id) DO UPDATE SET
           responses = COALESCE(camp201_team_workspace.responses, '{}'::jsonb) || jsonb_build_object($3::text, $4::text),
           answer_meta = COALESCE(camp201_team_workspace.answer_meta, '{}'::jsonb)
                         || jsonb_build_object($3::text, jsonb_build_object('by', $5::int, 'at', $6::text)),
           last_edited_by = $5,
           updated_at = NOW()
         RETURNING 1
       ) SELECT COUNT(*)::int AS n FROM up`,
      z.object({ n: z.coerce.number() }),
      [input.presentation_id, input.team_id, input.question_key, input.answer, viewer.camperId, nowIso],
      { label: "Save one workspace answer" }
    );

    const saved = await readCurrent();
    return { status: "saved" as const, saved_at: saved.saved_at, saved_by_name: saved.saved_by_name, current_answer: null };
  },
});
