import { api, z, postgres, gemini } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, cohortIdSql, requireCounselor, resolveViewCohort } from "../../lib/cohort.js";
import { buildScriptPrompt, GEMINI_SCRIPT_SCHEMA, ScriptSchema } from "../../lib/ebr-script.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";
const GEMINI = "9284363a-0a4f-4167-b9fb-8d8e83c589ed";
const TEXT_MODEL = "gemini-2.5-flash";

/** EBR sessions: titled "EBR", or any session teams have assigned counselor roles for. */
const EBR_PRESENTATION_SQL = `(p.title ILIKE '%ebr%' OR EXISTS (SELECT 1 FROM camp201_ebr_role_assignments x WHERE x.presentation_id = p.id))`;

const RoleRowSchema = z.object({
  presentation_id: z.coerce.number(),
  presentation_title: z.string(),
  day_number: z.coerce.number().nullable(),
  team_id: z.coerce.number(),
  team_name: z.string(),
  team_color: z.string().nullable(),
  team_logo: z.string().nullable(),
  company_name: z.string(),
  industry: z.string().nullable(),
  counselor_id: z.coerce.number(),
  counselor_name: z.string(),
  counselor_email: z.string(),
  executive_role: z.string(),
  notes: z.string().nullable(),
  script: z.unknown().nullable(),
  script_generated_at: z.string().nullable(),
});

export const GetEbrCounselorRoles = api({
  name: "GetEbrCounselorRoles",
  description: "Lists every counselor's Mini EBR role with saved prep scripts",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    my_counselor_id: z.number().nullable(),
    roles: z.array(RoleRowSchema.extend({ script: ScriptSchema.nullable() })),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const view = await resolveViewCohort(db, ctx.user.email);

    const [rows, me] = await Promise.all([
      db.query(
        `SELECT p.id AS presentation_id, p.title AS presentation_title, p.day_number,
                t.id AS team_id, t.name AS team_name, t.color AS team_color, NULLIF(t.logo_url, '') AS team_logo,
                COALESCE(NULLIF(btrim(ra.company_name), ''), t.assigned_company->>'name', '') AS company_name,
                t.assigned_company->>'industry' AS industry,
                ra.counselor_id, trim(concat(c.first_name, ' ', c.last_name)) AS counselor_name, c.email AS counselor_email,
                ra.executive_role, NULLIF(btrim(ra.notes), '') AS notes,
                s.script, to_char(s.generated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS script_generated_at
           FROM camp201_ebr_role_assignments ra
           JOIN camp201_presentations p ON p.id = ra.presentation_id
           JOIN camp201_teams t ON t.id = ra.team_id
           JOIN camp201_campers c ON c.id = ra.counselor_id
           LEFT JOIN camp201_ebr_counselor_scripts s
             ON s.presentation_id = ra.presentation_id AND s.team_id = ra.team_id AND s.counselor_id = ra.counselor_id
          WHERE t.cohort_id = ${cohortIdSql(view.cohortId)} AND ${EBR_PRESENTATION_SQL}
          ORDER BY p.day_number NULLS LAST, p.id, t.name, counselor_name
          LIMIT 300`,
        RoleRowSchema,
        undefined,
        { label: "Counselor EBR roles" }
      ),
      db.query(
        `SELECT id FROM camp201_campers WHERE lower(email) = lower($1) AND role IN ('counselor', 'admin') ORDER BY id LIMIT 1`,
        z.object({ id: z.coerce.number() }),
        [ctx.user.email ?? ""],
        { label: "My counselor id" }
      ),
    ]);

    return {
      my_counselor_id: me[0]?.id ?? null,
      roles: rows.map((r) => {
        const parsed = ScriptSchema.safeParse(r.script);
        return { ...r, script: parsed.success ? parsed.data : null };
      }),
    };
  },
});

const GeminiTextResponse = z
  .object({
    candidates: z
      .array(
        z
          .object({
            content: z.object({ parts: z.array(z.object({ text: z.string().optional() }).passthrough()).optional() }).passthrough().optional(),
            finishReason: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
    promptFeedback: z.object({ blockReason: z.string().optional() }).passthrough().optional(),
  })
  .passthrough();

export const GenerateEbrScript = api({
  name: "GenerateEbrScript",
  description: "Uses Gemini to write a counselor's EBR role prep script",
  integrations: { camp_201_db: postgres(APPS_DB), gemini: gemini(GEMINI) },
  input: z.object({
    presentation_id: z.number().int(),
    team_id: z.number().int(),
    counselor_id: z.number().int(),
  }),
  output: z.object({ script: ScriptSchema, generated_at: z.string() }),
  async run(ctx, { presentation_id, team_id, counselor_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);

    const [ctxRows, members, others, materials, workspace] = await Promise.all([
      db.query(
        `SELECT p.title, concat_ws(' ', p.description, p.instructions) AS brief,
                COALESCE(p.present_time_minutes, 30) AS minutes,
                ra.executive_role, COALESCE(NULLIF(btrim(ra.company_name), ''), t.assigned_company->>'name', 'the customer') AS company,
                t.assigned_company->>'industry' AS industry, COALESCE(ra.notes, '') AS notes, t.name AS team_name
           FROM camp201_ebr_role_assignments ra
           JOIN camp201_presentations p ON p.id = ra.presentation_id
           JOIN camp201_teams t ON t.id = ra.team_id
          WHERE ra.presentation_id = $1 AND ra.team_id = $2 AND ra.counselor_id = $3
          LIMIT 1`,
        z.object({
          title: z.string(), brief: z.string().nullable(), minutes: z.coerce.number(),
          executive_role: z.string(), company: z.string(), industry: z.string().nullable(),
          notes: z.string(), team_name: z.string(),
        }),
        [presentation_id, team_id, counselor_id],
        { label: "Load role assignment" }
      ),
      db.query(
        `SELECT trim(concat(first_name, ' ', last_name)) AS name, NULLIF(btrim(role), '') AS role
           FROM camp201_campers WHERE team_id = $1 AND removed_at IS NULL AND role NOT IN ('counselor', 'admin')
          ORDER BY first_name LIMIT 12`,
        z.object({ name: z.string(), role: z.string().nullable() }),
        [team_id],
        { label: "Team members" }
      ),
      db.query(
        `SELECT trim(concat(c.first_name, ' ', c.last_name)) AS name, ra.executive_role AS role
           FROM camp201_ebr_role_assignments ra JOIN camp201_campers c ON c.id = ra.counselor_id
          WHERE ra.presentation_id = $1 AND ra.team_id = $2 AND ra.counselor_id <> $3
          LIMIT 10`,
        z.object({ name: z.string(), role: z.string() }),
        [presentation_id, team_id, counselor_id],
        { label: "Other executives in the room" }
      ),
      db.query(
        `SELECT item_type, COALESCE(title, '') AS title, COALESCE(content, '') AS content, COALESCE(link_url, '') AS link_url
           FROM camp201_hub_items
          WHERE team_id = $1 AND section = 'pres_' || $2::text
          ORDER BY is_pinned DESC, created_at DESC LIMIT 15`,
        z.object({ item_type: z.string().nullable(), title: z.string(), content: z.string(), link_url: z.string() }),
        [team_id, presentation_id],
        { label: "Team's EBR board posts" }
      ),
      db.query(
        `SELECT COALESCE(responses, '{}'::jsonb)::text AS responses FROM camp201_team_workspace
          WHERE presentation_id = $1 AND team_id = $2 LIMIT 1`,
        z.object({ responses: z.string() }),
        [presentation_id, team_id],
        { label: "Team's EBR workspace answers" }
      ),
    ]);

    const a = ctxRows[0];
    if (!a) throw new Error("That role assignment no longer exists. Refresh and try again.");

    const teamMaterials: string[] = materials
      .map((m) => [m.title, m.content, m.link_url ? `(link: ${m.link_url})` : ""].filter(Boolean).join(": ").slice(0, 400))
      .filter((s) => s.trim().length > 0);
    try {
      const answers = Object.values(JSON.parse(workspace[0]?.responses ?? "{}") as Record<string, unknown>)
        .map((v) => String(v ?? "").trim())
        .filter(Boolean);
      for (const ans of answers.slice(0, 10)) teamMaterials.push(ans.slice(0, 400));
    } catch {
      // No usable workspace answers.
    }

    const prompt = buildScriptPrompt({
      presentationTitle: a.title,
      presentationBrief: a.brief ?? "",
      minutes: a.minutes >= 20 ? a.minutes : 30,
      role: a.executive_role,
      company: a.company,
      industry: a.industry,
      roleNotes: a.notes,
      teamName: a.team_name,
      members,
      otherRoles: others,
      teamMaterials,
    });

    const result = await ctx.integrations.gemini.apiRequest(
      {
        method: "POST",
        path: `/v1beta/models/${TEXT_MODEL}:generateContent`,
        body: {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: GEMINI_SCRIPT_SCHEMA,
          },
        },
      },
      { response: GeminiTextResponse },
      { label: "Write EBR prep script" }
    );

    const text = (result.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    if (!text) {
      const why = result.promptFeedback?.blockReason || result.candidates?.[0]?.finishReason;
      throw new Error(why && why !== "STOP" ? `Gemini couldn't write this script (${why}). Try again.` : "Gemini didn't return a script. Try again.");
    }
    let script;
    try {
      script = ScriptSchema.parse(JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")));
    } catch {
      throw new Error("Gemini returned a script we couldn't read. Try again.");
    }

    const saved = await db.query(
      `INSERT INTO camp201_ebr_counselor_scripts (presentation_id, team_id, counselor_id, script, generated_by, generated_at)
       VALUES ($1, $2, $3, $4::jsonb,
               (SELECT id FROM camp201_campers WHERE lower(email) = lower($5) ORDER BY id LIMIT 1), NOW())
       ON CONFLICT (presentation_id, team_id, counselor_id)
       DO UPDATE SET script = EXCLUDED.script, generated_by = EXCLUDED.generated_by, generated_at = NOW()
       RETURNING to_char(generated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS generated_at`,
      z.object({ generated_at: z.string() }),
      [presentation_id, team_id, counselor_id, JSON.stringify(script), ctx.user.email ?? ""],
      { label: "Save prep script" }
    );

    return { script, generated_at: saved[0]?.generated_at ?? new Date().toISOString() };
  },
});
