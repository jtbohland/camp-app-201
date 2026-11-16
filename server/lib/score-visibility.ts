import { z } from "@superblocksteam/sdk-api";
import { countJudges } from "./rubric-judges.js";

export type TeamRubricResult = {
  team_id: number;
  template_id: number;
  judge_count: number;
  /** Average of every judge's total, one decimal. */
  avg_total: number;
  max: number;
};

const Row = z.object({
  team_id: z.coerce.number(),
  template_id: z.coerce.number(),
  judge_count: z.coerce.number(),
  avg_total: z.coerce.number(),
  max: z.coerce.number(),
});

/**
 * Per-team rubric results for the given rubrics in one cohort, plus how many judges must score
 * before a team's result is shown to cAMPers. A result is "complete" once every judge has scored it.
 */
export async function loadRubricResults(
  db: any,
  cohortId: number,
  templateIds: number[]
): Promise<{ results: Map<string, TeamRubricResult>; requiredJudges: number }> {
  const requiredJudges = await countJudges(db, cohortId);
  const results = new Map<string, TeamRubricResult>();
  if (templateIds.length === 0) return { results, requiredJudges };
  const rows = await db.query(
    `SELECT team_id, template_id, COUNT(*)::int AS judge_count,
            ROUND(AVG(total_score)::numeric, 1) AS avg_total, MAX(max_score) AS max
     FROM camp201_rubric_scores
     WHERE cohort_id = $1 AND template_id = ANY($2::int[])
     GROUP BY team_id, template_id
     LIMIT 500`,
    Row,
    [cohortId, templateIds],
    { label: "Rubric results per team" }
  );
  for (const r of rows as TeamRubricResult[]) results.set(resultKey(r.template_id, r.team_id), r);
  return { results, requiredJudges };
}

export const resultKey = (templateId: number, teamId: number) => `${templateId}:${teamId}`;

/** True once every judge on the cohort has scored this team. */
export function isFullyScored(judgeCount: number, requiredJudges: number): boolean {
  return requiredJudges > 0 && judgeCount >= requiredJudges;
}
