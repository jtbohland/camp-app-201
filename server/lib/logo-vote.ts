import { z } from "@superblocksteam/sdk-api";

/** Team points by place (tied teams share a place). */
const PLACE_POINTS: Record<number, number> = { 1: 20, 2: 15, 3: 10, 4: 5 };
const PLACE_LABELS: Record<number, string> = { 1: "1st", 2: "2nd", 3: "3rd", 4: "4th" };

export type FinalizeResult = {
  finalized: boolean;
  message: string;
  best_logo_team_ids: number[];
};

const markerKey = (cohortId: number) => `logo_vote_finalized_cohort_${cohortId}`;

/** True once this cohort's logo vote has been closed and points awarded. */
export async function isLogoVoteFinalized(db: any, cohortId: number | null): Promise<boolean> {
  if (cohortId === null) return false;
  const rows = await db.query(
    `SELECT 1 AS x FROM camp201_config WHERE key = $1 LIMIT 1`,
    z.object({ x: z.coerce.number() }),
    [markerKey(cohortId)],
    { label: "Check logo vote finalized" }
  );
  return rows.length > 0;
}

/**
 * Closes logo voting for a cohort with whatever votes are in: ranks teams by votes (ties share a
 * place), awards team points (20/15/10/5), marks the top team(s) Best Logo, and locks the gate.
 * Runs at most once per cohort, even if two people trigger it at the same moment.
 */
export async function finalizeLogoVote(db: any, cohortId: number): Promise<FinalizeResult> {
  // Claim the cohort first so a second caller can't award points twice.
  const claimed = await db.query(
    `WITH ins AS (
       INSERT INTO camp201_config (key, value, updated_at) VALUES ($1, 'true', NOW())
       ON CONFLICT (key) DO NOTHING
       RETURNING key
     ) SELECT COUNT(*)::int AS n FROM ins`,
    z.object({ n: z.coerce.number() }),
    [markerKey(cohortId)],
    { label: "Claim logo vote finalize" }
  );
  if ((claimed[0]?.n ?? 0) === 0) {
    return { finalized: false, message: "Logo voting was already closed and points awarded.", best_logo_team_ids: [] };
  }

  const ranked = await db.query(
    `SELECT v.team_id, COUNT(*)::int AS votes,
            DENSE_RANK() OVER (ORDER BY COUNT(*) DESC)::int AS place
     FROM camp201_team_logo_votes v
     JOIN camp201_teams t ON t.id = v.team_id
     WHERE t.cohort_id = $1
     GROUP BY v.team_id
     ORDER BY votes DESC
     LIMIT 20`,
    z.object({ team_id: z.coerce.number(), votes: z.coerce.number(), place: z.coerce.number() }),
    [cohortId],
    { label: "Rank teams by logo votes" }
  );

  for (const row of ranked) {
    const pts = PLACE_POINTS[row.place] ?? 0;
    if (pts <= 0) continue;
    await db.execute(
      `UPDATE camp201_teams SET team_points = COALESCE(team_points, 0) + $2 WHERE id = $1`,
      [row.team_id, pts],
      { label: `Award ${pts} team pts (logo ${PLACE_LABELS[row.place]})` }
    );
    // Shown on each member's history; counts once, on the team total.
    await db.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, cohort_id, category)
       SELECT c.id, $2, $3, 'system', $4, 'team_award'
       FROM camp201_campers c
       WHERE c.team_id = $1 AND c.role NOT IN ('counselor', 'admin')`,
      [row.team_id, pts, `Logo vote - ${PLACE_LABELS[row.place]} place`, cohortId],
      { label: `Log logo points for team ${row.team_id}` }
    );
  }

  const winners = ranked.filter((r: { place: number }) => r.place === 1).map((r: { team_id: number }) => r.team_id);
  await db.execute(
    `UPDATE camp201_teams SET best_logo = (id = ANY($2::int[])) WHERE cohort_id = $1`,
    [cohortId, winners],
    { label: "Mark Best Logo team" }
  );

  await db.execute(
    `UPDATE camp201_feature_gates SET is_locked = true, unlock_at = NULL, updated_at = NOW()
     WHERE feature_key = 'logo_voting'`,
    undefined,
    { label: "Lock logo voting" }
  );

  return {
    finalized: true,
    message: ranked.length === 0
      ? "Voting closed. No votes were cast, so no points were awarded."
      : "Voting closed and points awarded! 🏆",
    best_logo_team_ids: winners,
  };
}
