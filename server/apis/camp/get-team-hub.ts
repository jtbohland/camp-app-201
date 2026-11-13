import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, resolveViewCohort } from "../../lib/cohort.js";
import { assertCanView, resolveHubViewer } from "../../lib/team-hub.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const HubItemSchema = z.object({
  id: z.coerce.number(),
  team_id: z.coerce.number(),
  author_id: z.coerce.number(),
  author_name: z.string(),
  section: z.string(),
  item_type: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  link_url: z.string().nullable(),
  is_pinned: z.boolean(),
  is_done: z.boolean(),
  assignee_id: z.coerce.number().nullable(),
  assignee_name: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const PresRow = z.object({
  id: z.coerce.number(),
  title: z.string(),
  presentation_type: z.string(),
  day_number: z.coerce.number(),
  sort_order: z.coerce.number(),
  is_locked: z.boolean(),
  status: z.string(),
  description: z.string().nullable(),
  instructions: z.string().nullable(),
  resources: z.any(),
  deck_template_url: z.string().nullable(),
  questions: z.any(),
  prep_time_minutes: z.coerce.number().nullable(),
  present_time_minutes: z.coerce.number().nullable(),
  rubric_template_id: z.coerce.number().nullable(),
  scores_revealed: z.boolean(),
  answered_count: z.coerce.number(),
  has_submission: z.boolean(),
});

const PresentationSchema = PresRow.extend({
  question_count: z.number(),
});

const FeedbackSchema = z.object({
  id: z.coerce.number(),
  session_label: z.string(),
  author_name: z.string(),
  category: z.string(),
  content: z.string(),
  created_at: z.string(),
});

const ScoreRow = z.object({
  template_id: z.coerce.number(),
  scores: z.any(),
  total_score: z.coerce.number(),
  max_score: z.coerce.number(),
});

const ScoreSummarySchema = z.object({
  presentation_id: z.number(),
  avg_total: z.number(),
  max: z.number(),
  judge_count: z.number(),
  criteria: z.array(z.object({ name: z.string(), avg: z.number() })),
});

type Question = { section?: string; questions?: unknown[] };

function countQuestions(raw: unknown): number {
  const sections = (typeof raw === "string" ? JSON.parse(raw) : raw) as Question[] | null;
  if (!Array.isArray(sections)) return 0;
  return sections.reduce((sum, s) => sum + (Array.isArray(s?.questions) ? s.questions.length : 0), 0);
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export default api({
  name: "GetTeamHub",
  description: "Loads a team's hub: posts, presentation briefs, prep progress, feedback, and revealed scores",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    team_id: z.number(),
  }),
  output: z.object({
    viewer: z.object({
      camper_id: z.number().nullable(),
      is_counselor: z.boolean(),
      is_member: z.boolean(),
      can_contribute: z.boolean(),
    }),
    items: z.array(HubItemSchema),
    /** Presentations on the schedule — one hub tab each. Brief fields are empty while locked (cAMPers). */
    presentations: z.array(PresentationSchema),
    /** cAMPfire peer feedback other cAMPers left for this team. `session_label` is the presentation title. */
    peer_feedback: z.array(FeedbackSchema),
    /** Rubric results, only for presentations whose scores counselors revealed (counselors always see them). */
    scores: z.array(ScoreSummarySchema),
    /** This team's slot in the active presenting order, if one is set. */
    presenting_slot: z.object({ label: z.string().nullable(), position: z.number(), total: z.number() }).nullable(),
  }),
  async run(ctx, { team_id }) {
    const db = ctx.integrations.camp_201_db;
    const viewer = await resolveHubViewer(db, ctx.user.email, team_id);
    assertCanView(viewer);
    const VIEW = cohortIdSql((await resolveViewCohort(db, ctx.user.email)).cohortId);

    const [items, presRows, feedback, scoreRows, orderRows] = await Promise.all([
      db.query(
        `SELECT h.id, h.team_id, h.author_id,
                (c.first_name || ' ' || c.last_name) AS author_name,
                h.section, h.item_type, h.title, h.content, h.link_url,
                h.is_pinned, h.is_done, h.assignee_id,
                NULLIF(trim(concat(a.first_name, ' ', a.last_name)), '') AS assignee_name,
                h.created_at::text, h.updated_at::text
         FROM camp201_hub_items h
         JOIN camp201_campers c ON c.id = h.author_id
         LEFT JOIN camp201_campers a ON a.id = h.assignee_id
         WHERE h.team_id = $1
         ORDER BY h.is_pinned DESC, h.created_at DESC
         LIMIT 300`,
        HubItemSchema,
        [team_id],
        { label: "Fetch team hub posts" }
      ),
      db.query(
        `SELECT p.id, p.title, COALESCE(p.presentation_type, 'standard') AS presentation_type,
                p.day_number, COALESCE(p.sort_order, 0) AS sort_order,
                COALESCE(p.is_locked, true) AS is_locked, COALESCE(p.status, 'upcoming') AS status,
                p.description, p.instructions, p.resources, p.deck_template_url,
                COALESCE(p.questions, '[]'::jsonb) AS questions,
                p.prep_time_minutes, p.present_time_minutes, p.rubric_template_id,
                COALESCE(p.scores_revealed, false) AS scores_revealed,
                COALESCE((SELECT COUNT(*) FROM jsonb_each_text(w.responses) r WHERE btrim(r.value) <> ''), 0) AS answered_count,
                EXISTS (SELECT 1 FROM camp201_hackathon_submissions hs
                        WHERE hs.presentation_id = p.id AND hs.team_id = $1) AS has_submission
         FROM camp201_presentations p
         LEFT JOIN camp201_team_workspace w ON w.presentation_id = p.id AND w.team_id = $1
         -- Team sessions only (the "Team" pill on Presentations); solo sessions never show in a team hub.
         WHERE p.presentation_type IN ('team_presentation', 'team_workshop', 'hackathon')
           AND p.day_number BETWEEN 1 AND COALESCE(
           (SELECT NULLIF(value, '')::int FROM camp201_config WHERE key = 'num_days' LIMIT 1), 3)
         ORDER BY p.day_number, p.sort_order, p.id
         LIMIT 50`,
        PresRow,
        [team_id],
        { label: "Fetch scheduled presentations with team prep progress" }
      ),
      db.query(
        `SELECT pf.id, pf.session_label, CONCAT(c.first_name, ' ', c.last_name) AS author_name,
                pf.category, pf.content, pf.created_at::text
         FROM camp201_peer_feedback pf
         JOIN camp201_campers c ON c.id = pf.author_id
         WHERE pf.team_id = $1 AND pf.cohort_id = ${VIEW}
         ORDER BY pf.created_at DESC
         LIMIT 200`,
        FeedbackSchema,
        [team_id],
        { label: "Fetch peer feedback for this team" }
      ),
      db.query(
        `SELECT template_id, scores, total_score, max_score
         FROM camp201_rubric_scores
         WHERE team_id = $1 AND cohort_id = ${VIEW}
         LIMIT 200`,
        ScoreRow,
        [team_id],
        { label: "Fetch rubric scores for this team" }
      ),
      db.query(
        `SELECT value FROM camp201_config WHERE key = 'active_presentation_order' LIMIT 1`,
        z.object({ value: z.string() }),
        undefined,
        { label: "Fetch presenting order" }
      ),
    ]);

    // cAMPers only see a presentation's brief once counselors unlock it.
    const presentations = presRows.map((p) => {
      const hidden = p.is_locked && !viewer.isCounselor;
      return {
        ...p,
        description: hidden ? null : p.description,
        instructions: hidden ? null : p.instructions,
        resources: hidden ? [] : (Array.isArray(p.resources) ? p.resources : []),
        deck_template_url: hidden ? null : p.deck_template_url,
        questions: hidden ? [] : p.questions,
        question_count: countQuestions(p.questions),
      };
    });

    // Rubric averages per presentation, only once revealed (judges' notes stay counselor-only).
    const scores = presRows
      .filter((p) => p.rubric_template_id !== null && (p.scores_revealed || viewer.isCounselor))
      .map((p) => {
        const rows = scoreRows.filter((s) => s.template_id === p.rubric_template_id);
        const perCriterion = new Map<string, number[]>();
        for (const r of rows) {
          const parsed = (typeof r.scores === "string" ? JSON.parse(r.scores) : r.scores) as Record<string, unknown> | null;
          for (const [name, value] of Object.entries(parsed ?? {})) {
            const n = Number(value);
            if (Number.isFinite(n)) perCriterion.set(name, [...(perCriterion.get(name) ?? []), n]);
          }
        }
        const avg = (ns: number[]) => (ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0);
        return {
          presentation_id: p.id,
          avg_total: round1(avg(rows.map((r) => r.total_score))),
          max: rows[0]?.max_score ?? 0,
          judge_count: rows.length,
          criteria: [...perCriterion.entries()].map(([name, ns]) => ({ name, avg: round1(avg(ns)) })),
        };
      })
      .filter((s) => s.judge_count > 0);

    let presenting_slot: { label: string | null; position: number; total: number } | null = null;
    try {
      const parsed = orderRows[0] ? JSON.parse(orderRows[0].value) : null;
      const order = (parsed?.order ?? []) as { position: number; team_id: number }[];
      const mine = order.find((o) => Number(o.team_id) === team_id);
      if (mine) presenting_slot = { label: parsed.label ?? null, position: Number(mine.position), total: order.length };
    } catch {
      presenting_slot = null;
    }

    return {
      viewer: {
        camper_id: viewer.camperId,
        is_counselor: viewer.isCounselor,
        is_member: viewer.isMember,
        can_contribute: viewer.canContribute,
      },
      items,
      presentations,
      peer_feedback: feedback,
      scores,
      presenting_slot,
    };
  },
});
