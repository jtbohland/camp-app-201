import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast } from "../../lib/cohort.js";
import { awardRubricImprovementBonus } from "../../lib/rubric-improvement.js";
import { isCampClosed } from "../../lib/camp-closed-guard.js";
import { countJudges, requireActiveCohort, resolveJudge } from "../../lib/rubric-judges.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";
const MINI_EBR_TEMPLATE_ID = 100;

export default api({
  name: "ScoreTeamPresentation",
  description: "A judge scores a team; each judge's score adds to team points",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    rubric_template_id: z.number(),
    team_id: z.number(),
    /** Kept for older clients; the judge is always the signed-in user. */
    scorer_camper_id: z.number().nullable().optional(),
    scores: z.string(), // JSON: {"criterion_name": score_value, ...}
    notes: z.string().max(5000).nullable(),
    mvp_camper_id: z.number().nullable().optional(), // Optional MVP award
  }),
  output: z.object({ success: z.boolean(), message: z.string(), total_score: z.number() }),
  async run(ctx, { presentation_id, rubric_template_id, team_id, scores, notes, mvp_camper_id }) {
    const db = ctx.integrations.camp_201_db;
    await assertNotViewingPast(db, ctx.user.email);
    if (await isCampClosed(db)) throw new Error("cAMP is closed. Scores are final.");
    const judge = await resolveJudge(db, ctx.user.email, ctx.user.name);
    const cohortId = await requireActiveCohort(db);

    const parsedScores = JSON.parse(scores) as Record<string, number>;
    const totalScore = Object.values(parsedScores).reduce((sum, v) => sum + (Number(v) || 0), 0);
    const cleanNotes = notes?.trim() ? notes.trim() : null;

    const rubrics = await db.query(
      `SELECT max_total_points, name FROM camp201_rubric_templates WHERE id = $1 LIMIT 1`,
      z.object({ max_total_points: z.coerce.number(), name: z.string().nullable() }),
      [rubric_template_id],
      { label: "Get rubric max points" }
    );
    const maxScore = rubrics[0]?.max_total_points ?? 15;
    const rubricName = rubrics[0]?.name ?? `rubric ${rubric_template_id}`;

    // One score per judge per team: this judge may already have scored this team.
    const existing = await db.query(
      `SELECT id, total_score FROM camp201_rubric_scores
       WHERE template_id = $1 AND team_id = $2 AND cohort_id = $3 AND lower(judge_email) = $4
       LIMIT 1`,
      z.object({ id: z.coerce.number(), total_score: z.coerce.number() }),
      [rubric_template_id, team_id, cohortId, judge.email],
      { label: "Find this judge's score" }
    );

    if (existing.length > 0) {
      // Re-score: replace this judge's score and move the team total by the difference only.
      const prev = existing[0];
      const delta = totalScore - prev.total_score;
      await db.execute(
        `UPDATE camp201_rubric_scores
         SET scores = $2::jsonb, total_score = $3, max_score = $4, notes = $5,
             points_awarded = $3, judge_name = $6, updated_at = NOW()
         WHERE id = $1`,
        [prev.id, JSON.stringify(parsedScores), totalScore, maxScore, cleanNotes, judge.name],
        { label: "Update this judge's score" }
      );
      if (delta !== 0) {
        await db.execute(
          `UPDATE camp201_teams SET team_points = team_points + $1 WHERE id = $2`,
          [delta, team_id],
          { label: "Adjust team points for re-score" }
        );
        await db.execute(
          `INSERT INTO camp201_team_points_log (team_id, points, reason, cohort_id) VALUES ($1, $2, $3, $4)`,
          [team_id, delta, `Rubric re-scored by ${judge.name}: ${prev.total_score} → ${totalScore}/${maxScore}`, cohortId],
          { label: "Log re-score adjustment" }
        );
      }
      return { success: true, message: `Score updated to ${totalScore}/${maxScore}.`, total_score: totalScore };
    }

    await db.execute(
      `INSERT INTO camp201_rubric_scores
         (template_id, team_id, scored_by, judge_email, judge_name, is_guest_judge,
          scores, total_score, max_score, notes, points_awarded, cohort_id, presentation_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $8, $11, $12)`,
      [rubric_template_id, team_id, judge.camperId, judge.email, judge.name, judge.isGuest,
       JSON.stringify(parsedScores), totalScore, maxScore, cleanNotes, cohortId, presentation_id],
      { label: "Save this judge's score" }
    );

    // Each judge's score adds to the TEAM total (2 counselors + 1 guest on a 50-pt rubric = up to 150).
    await db.execute(
      `UPDATE camp201_teams SET team_points = team_points + $1 WHERE id = $2`,
      [totalScore, team_id],
      { label: "Add judge score to team_points" }
    );
    await db.execute(
      `INSERT INTO camp201_team_points_log (team_id, points, reason, cohort_id) VALUES ($1, $2, $3, $4)`,
      [team_id, totalScore, `Presentation rubric (${judge.name}): ${totalScore}/${maxScore}`, cohortId],
      { label: "Log rubric team points" }
    );

    const improvement = await awardRubricImprovementBonus(db, team_id, totalScore, maxScore, cohortId);

    // MVP: +10 individual points to one presenter on the team, at most once per team per rubric
    // (several judges may each pick an MVP; only the first one counts). Counselors are never eligible.
    if (mvp_camper_id) {
      const MVP_POINTS = 10;
      const reason = `MVP — Most Valuable Presenter (${rubricName})`;
      await db.execute(
        `WITH ins AS (
           INSERT INTO camp201_points_log (camper_id, points, reason, category, cohort_id)
           SELECT c.id, $2, $3, 'presentation', $4
           FROM camp201_campers c
           WHERE c.id = $1 AND c.team_id = $5
             AND NOT EXISTS (
               SELECT 1 FROM camp201_points_log pl
               JOIN camp201_campers m ON m.id = pl.camper_id
               WHERE m.team_id = $5 AND pl.reason = $3)
           RETURNING camper_id
         )
         UPDATE camp201_campers SET points = points + $2 WHERE id IN (SELECT camper_id FROM ins)`,
        [mvp_camper_id, MVP_POINTS, reason, cohortId, team_id],
        { label: "Award MVP points (once per team)" }
      );
    }

    // Mini EBR: once every judge has scored every team, cAMP is ready to close.
    if (rubric_template_id === MINI_EBR_TEMPLATE_ID) {
      const counts = await db.query(
        `SELECT
           (SELECT COUNT(*) FROM camp201_teams WHERE cohort_id = $1 AND name <> 'TEST') AS teams,
           (SELECT COUNT(*) FROM camp201_rubric_scores WHERE template_id = $2 AND cohort_id = $1) AS scores`,
        z.object({ teams: z.coerce.number(), scores: z.coerce.number() }),
        [cohortId, MINI_EBR_TEMPLATE_ID],
        { label: "Count Mini EBR progress" }
      );
      const needed = (await countJudges(db, cohortId)) * (counts[0]?.teams ?? 0);
      if (needed > 0 && (counts[0]?.scores ?? 0) >= needed) {
        await db.execute(
          `INSERT INTO camp201_config (key, value, updated_at) VALUES ('camp_ready_to_close', 'true', NOW())
           ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW()`,
          undefined,
          { label: "Set camp_ready_to_close" }
        );
      }
    }

    const improvementMsg = improvement.reasons.length > 0 ? ` 🔥 ${improvement.reasons.join(". ")}` : "";
    return {
      success: true,
      message: `Team scored ${totalScore}/${maxScore}! +${totalScore} team points.${improvementMsg}`,
      total_score: totalScore,
    };
  },
});
