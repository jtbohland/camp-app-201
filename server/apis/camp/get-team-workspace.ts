import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getCounselorAccess } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const MetaSchema = z.object({ saved_at: z.string(), saved_by_name: z.string().nullable() });

export default api({
  name: "GetTeamWorkspace",
  description: "Gets a team's shared workspace answers and who saved each",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    team_id: z.number(),
  }),
  output: z.object({
    responses: z.record(z.string(), z.string()),
    /** Per question: when it was last saved and by whom. */
    meta: z.record(z.string(), MetaSchema),
    last_edited_by: z.number().nullable(),
    hasResponses: z.boolean(),
  }),
  async run(ctx, { presentation_id, team_id }) {
    const db = ctx.integrations.camp_201_db;
    const empty = { responses: {}, meta: {}, last_edited_by: null, hasResponses: false };

    // Locked sessions show nothing to cAMPers.
    const [lock, access] = await Promise.all([
      db.query(
        `SELECT COALESCE(is_locked, true) AS locked FROM camp201_presentations WHERE id = $1 LIMIT 1`,
        z.object({ locked: z.boolean() }),
        [presentation_id],
        { label: "Check presentation lock" }
      ),
      getCounselorAccess(db, ctx.user.email),
    ]);
    if (lock[0]?.locked !== false && !access.isAdmin) return empty;

    const rows = await db.query(
      `SELECT responses, answer_meta, last_edited_by FROM camp201_team_workspace
       WHERE presentation_id = $1 AND team_id = $2 LIMIT 1`,
      z.object({ responses: z.any(), answer_meta: z.any(), last_edited_by: z.coerce.number().nullable() }),
      [presentation_id, team_id],
      { label: "Get team workspace" }
    );
    if (rows.length === 0) return empty;

    const parse = (v: unknown): Record<string, unknown> =>
      (typeof v === "string" ? JSON.parse(v) : v ?? {}) as Record<string, unknown>;
    const responses: Record<string, string> = {};
    for (const [k, v] of Object.entries(parse(rows[0].responses))) responses[k] = typeof v === "string" ? v : String(v ?? "");

    // Names for everyone who saved an answer.
    const rawMeta = parse(rows[0].answer_meta) as Record<string, { by?: number; at?: string }>;
    const ids = [...new Set(Object.values(rawMeta).map((m) => Number(m?.by)).filter((n) => Number.isFinite(n)))];
    const names = new Map<number, string>();
    if (ids.length > 0) {
      const people = await db.query(
        `SELECT id, NULLIF(trim(concat(first_name, ' ', last_name)), '') AS name
         FROM camp201_campers WHERE id = ANY($1::int[]) LIMIT 100`,
        z.object({ id: z.coerce.number(), name: z.string().nullable() }),
        [ids],
        { label: "Names of who saved answers" }
      );
      for (const p of people) if (p.name) names.set(p.id, p.name);
    }
    const meta: Record<string, z.infer<typeof MetaSchema>> = {};
    for (const [k, m] of Object.entries(rawMeta)) {
      if (m && typeof m.at === "string") meta[k] = { saved_at: m.at, saved_by_name: names.get(Number(m.by)) ?? null };
    }

    return { responses, meta, last_edited_by: rows[0].last_edited_by, hasResponses: true };
  },
});
