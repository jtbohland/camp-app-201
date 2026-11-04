import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getActiveCohortId, getCounselorAccess } from "../../lib/cohort.js";
import { countJudges } from "../../lib/rubric-judges.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const JudgeScoreSchema = z.object({
  id: z.coerce.number(),
  team_id: z.coerce.number(),
  team_name: z.string(),
  judge_email: z.string().nullable(),
  judge_name: z.string().nullable(),
  is_guest_judge: z.boolean(),
  scores: z.any(),
  total_score: z.coerce.number(),
  max_score: z.coerce.number(),
  notes: z.string().nullable(),
  scored_at: z.string().nullable(),
});

export default api({
  name: "GetRubricTemplate",
  description: "Gets a rubric with each judge's scores and team totals",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    rubric_template_id: z.number(),
  }),
  output: z.object({
    template: z.any(),
    /** One row per judge per team (active cohort). Counselors only; empty for cAMPers. */
    scores: z.array(JudgeScoreSchema),
    /** Sum of every judge's score per team. */
    teamTotals: z.array(z.object({
      team_id: z.number(), team_name: z.string(), total: z.number(), max: z.number(), judge_count: z.number(),
    })),
    /** The signed-in user's own email, so the panel can find "my" scores. */
    myEmail: z.string(),
    /** Counselors in the active cohort plus active guest judges. */
    judgeCount: z.number(),
  }),
  async run(ctx, { rubric_template_id }) {
    const db = ctx.integrations.camp_201_db;
    const myEmail = (ctx.user.email ?? "").toLowerCase();
    const templates = await db.query(
      `SELECT id, name, description, criteria, max_total_points, points_to_award
       FROM camp201_rubric_templates WHERE id = $1 LIMIT 1`,
      z.object({
        id: z.coerce.number(), name: z.string(), description: z.string().nullable(),
        criteria: z.any(), max_total_points: z.coerce.number(), points_to_award: z.coerce.number(),
      }),
      [rubric_template_id],
      { label: "Get rubric template" }
    );
    if (templates.length === 0) return { template: null, scores: [], teamTotals: [], myEmail, judgeCount: 0 };

    const template = templates[0];
    template.criteria = typeof template.criteria === "string" ? JSON.parse(template.criteria) : template.criteria;

    // Scores and judges' notes are for counselors only.
    const access = await getCounselorAccess(db, ctx.user.email);
    const cohortId = await getActiveCohortId(db);
    if (!access.isAdmin || cohortId === null) return { template, scores: [], teamTotals: [], myEmail, judgeCount: 0 };
    const judgeCount = await countJudges(db, cohortId);

    const scores = await db.query(
      `SELECT rs.id, rs.team_id, t.name AS team_name,
              lower(COALESCE(rs.judge_email, c.email)) AS judge_email,
              COALESCE(rs.judge_name, NULLIF(trim(concat(c.first_name, ' ', c.last_name)), '')) AS judge_name,
              COALESCE(rs.is_guest_judge, false) AS is_guest_judge,
              rs.scores, rs.total_score, rs.max_score, rs.notes,
              COALESCE(rs.updated_at, rs.created_at)::text AS scored_at
       FROM camp201_rubric_scores rs
       JOIN camp201_teams t ON t.id = rs.team_id
       LEFT JOIN camp201_campers c ON c.id = rs.scored_by
       WHERE rs.template_id = $1 AND rs.cohort_id = $2
       ORDER BY t.name, judge_name LIMIT 200`,
      JudgeScoreSchema,
      [rubric_template_id, cohortId],
      { label: "Get each judge's scores" }
    );

    const byTeam = new Map<number, { team_id: number; team_name: string; total: number; max: number; judge_count: number }>();
    for (const s of scores) {
      const t = byTeam.get(s.team_id) ?? { team_id: s.team_id, team_name: s.team_name, total: 0, max: 0, judge_count: 0 };
      t.total += s.total_score;
      t.max += s.max_score;
      t.judge_count += 1;
      byTeam.set(s.team_id, t);
    }
    const teamTotals = [...byTeam.values()].sort((a, b) => b.total - a.total);

    return { template, scores, teamTotals, myEmail, judgeCount };
  },
});
