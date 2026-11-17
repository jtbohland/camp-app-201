import { z } from "@superblocksteam/sdk-api";

/**
 * Size-fair team scoring.
 *
 * A team's score = (average member points × the cohort's standard team size) + team bonus points.
 * The standard size is the most common team size in the cohort (ties go to the smaller size), so
 * teams of the usual size keep their exact total and only bigger/smaller teams are scaled.
 * Team bonus points (races, rubrics, hackathon, logo) never depend on headcount, so they are added as-is.
 */

export type TeamScoreInput = {
  id: number;
  name: string;
  /** Sum of the individual points of the team's cAMPers (counselors excluded). */
  member_points: number;
  /** Number of cAMPers on the team (counselors excluded). */
  member_count: number;
  team_points: number;
};

export type TeamScore = {
  /** Size-fair score used for every ranking. */
  total_points: number;
  /** Old-style plain sum (all member points + team points), for reference. */
  raw_points: number;
  /** True when this team's member points were scaled because its size differs from the standard. */
  size_adjusted: boolean;
  /** Team size every team is scored against. 0 when no team has members yet. */
  standard_size: number;
};

const isTestTeam = (name: string) => name.trim().toUpperCase() === "TEST";

/** Most common non-empty team size (ignoring TEST teams). Ties go to the smaller size. */
export function standardTeamSize(teams: Pick<TeamScoreInput, "name" | "member_count">[]): number {
  const counts = new Map<number, number>();
  for (const t of teams) {
    if (t.member_count <= 0 || isTestTeam(t.name)) continue;
    counts.set(t.member_count, (counts.get(t.member_count) ?? 0) + 1);
  }
  let best = 0;
  let bestFreq = 0;
  for (const [size, freq] of counts) {
    if (freq > bestFreq || (freq === bestFreq && size < best)) {
      best = size;
      bestFreq = freq;
    }
  }
  return best;
}

export function scoreTeam(t: TeamScoreInput, standardSize: number): TeamScore {
  const teamPts = t.team_points ?? 0;
  const raw = t.member_points + teamPts;
  if (t.member_count <= 0 || standardSize <= 0 || t.member_count === standardSize) {
    return { total_points: raw, raw_points: raw, size_adjusted: false, standard_size: standardSize };
  }
  const scaledMembers = Math.round((t.member_points / t.member_count) * standardSize);
  return {
    total_points: scaledMembers + teamPts,
    raw_points: raw,
    size_adjusted: true,
    standard_size: standardSize,
  };
}

/** Scores every team against the cohort's standard size. Keeps input order. */
export function scoreTeams<T extends TeamScoreInput>(teams: T[]): (T & TeamScore)[] {
  const size = standardTeamSize(teams);
  return teams.map((t) => ({ ...t, ...scoreTeam(t, size) }));
}

const TeamTotalsRow = z.object({
  id: z.coerce.number(),
  name: z.string(),
  member_points: z.coerce.number(),
  member_count: z.coerce.number(),
  team_points: z.coerce.number(),
});

/**
 * Live size-fair totals for every team in a cohort, highest first (ties alphabetical).
 * TEST teams still shape nothing (they're ignored for the standard size); `excludeTest` also drops them from the list.
 */
export async function loadTeamTotals(
  db: any,
  cohortId: number,
  opts: { excludeTest?: boolean } = {}
): Promise<(TeamScoreInput & TeamScore)[]> {
  const rows: z.infer<typeof TeamTotalsRow>[] = await db.query(
    `SELECT t.id, t.name,
            COALESCE(SUM(c.points), 0) AS member_points,
            COUNT(c.id) AS member_count,
            COALESCE(t.team_points, 0) AS team_points
     FROM camp201_teams t
     LEFT JOIN camp201_campers c ON c.team_id = t.id AND c.role NOT IN ('counselor', 'admin')
     WHERE t.cohort_id = $1
     GROUP BY t.id, t.name, t.team_points
     LIMIT 100`,
    TeamTotalsRow,
    [cohortId],
    { label: "Team totals (size-fair)" }
  );
  const scored = scoreTeams(rows)
    .filter((t) => !(opts.excludeTest && isTestTeam(t.name)))
    .sort((a, b) => b.total_points - a.total_points || a.name.localeCompare(b.name));
  return scored;
}
