/**
 * Rubric improvement bonus — awards team_points when a team improves
 * their presentation score over their previous best.
 *
 * Thresholds (% of max score):
 *   5%+ improvement  → +3 team_points
 *   10%+ improvement → +5 team_points
 *   First time 90%+  → +7 team_points
 *   Perfect score     → +10 team_points
 *
 * Bonuses stack: a team that improves 10% AND hits 90% gets +5 + +7 = +12.
 */
import { z } from "@superblocksteam/sdk-api";

type DbClient = {
  query: (...args: any[]) => Promise<any[]>;
  execute: (...args: any[]) => Promise<any>;
};

export async function awardRubricImprovementBonus(
  db: DbClient,
  teamId: number,
  totalScore: number,
  maxScore: number,
  cohortId: number | null,
): Promise<{ bonus: number; reasons: string[] }> {
  const currentPct = (totalScore / maxScore) * 100;
  let bonus = 0;
  const reasons: string[] = [];

  // Get team's previous best score (across all rubric scores for this team)
  const PrevSchema = z.object({ best_pct: z.coerce.number(), has_90: z.coerce.number() });
  const prevResult = await db.query(
    `SELECT
       COALESCE(MAX((total_score::float / NULLIF(max_score, 0)) * 100), 0) as best_pct,
       COUNT(*) FILTER (WHERE (total_score::float / NULLIF(max_score, 0)) * 100 >= 90) as has_90
     FROM camp201_rubric_scores
     WHERE team_id = $1
     LIMIT 1`,
    PrevSchema,
    [teamId],
    { label: "Get team's previous best rubric score" }
  );

  const prevBestPct = prevResult.length > 0 ? prevResult[0].best_pct : 0;
  const hadPrevious90 = prevResult.length > 0 && prevResult[0].has_90 > 0;
  const improvement = currentPct - prevBestPct;

  // Improvement bonuses (only if they had a previous score to improve on)
  if (prevBestPct > 0 && improvement >= 10) {
    bonus += 5;
    reasons.push(`+5 team pts: improved ${improvement.toFixed(0)}%+ over previous best`);
  } else if (prevBestPct > 0 && improvement >= 5) {
    bonus += 3;
    reasons.push(`+3 team pts: improved ${improvement.toFixed(0)}%+ over previous best`);
  }

  // First time hitting 90%+
  if (currentPct >= 90 && !hadPrevious90) {
    bonus += 7;
    reasons.push(`+7 team pts: first time scoring 90%+!`);
  }

  // Perfect score
  if (totalScore === maxScore) {
    bonus += 10;
    reasons.push(`+10 team pts: PERFECT SCORE!`);
  }

  // Award the bonus
  if (bonus > 0) {
    await db.execute(
      `UPDATE camp201_teams SET team_points = team_points + $1 WHERE id = $2`,
      [bonus, teamId],
      { label: `Award rubric improvement bonus: +${bonus}` }
    );
    await db.execute(
      `INSERT INTO camp201_team_points_log (team_id, points, reason, cohort_id)
       VALUES ($1, $2, $3, $4)`,
      [teamId, bonus, `Rubric improvement: ${reasons.join('; ')}`, cohortId],
      { label: "Log rubric improvement bonus" }
    );
  }

  return { bonus, reasons };
}
