import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SubmitTeamVote",
  description: "Casts a vote for a team logo; awards points after all votes are in",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    team_id: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  async run(ctx, { camper_id, team_id }) {
    // Check if voting is open (is_locked = false means open)
    const gateResult = await ctx.integrations.apps_database.query(
      `SELECT is_locked FROM camp201_feature_gates WHERE feature_key = $1 LIMIT 1`,
      z.object({ is_locked: z.boolean() }),
      ["logo_voting"],
      { label: "Check logo_voting gate" }
    );
    if (gateResult.length === 0 || gateResult[0].is_locked) {
      return { success: false, message: "Logo voting is not open yet" };
    }

    // Check camper is not on the team they're voting for (anti-self-vote)
    const camperTeam = await ctx.integrations.apps_database.query(
      `SELECT team_id FROM camp201_campers WHERE id = $1 LIMIT 1`,
      z.object({ team_id: z.coerce.number().nullable() }),
      [camper_id],
      { label: "Check camper team" }
    );
    if (camperTeam.length > 0 && camperTeam[0].team_id === team_id) {
      return { success: false, message: "You can't vote for your own team!" };
    }

    // Check if already voted
    const existing = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_team_logo_votes WHERE user_id = $1 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [camper_id],
      { label: "Check existing vote" }
    );
    if (existing.length > 0) {
      return { success: false, message: "You've already cast your vote!" };
    }

    // Cast vote
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_team_logo_votes (user_id, team_id) VALUES ($1, $2)`,
      [camper_id, team_id],
      { label: "Cast vote" }
    );

    // Check if all campers have now voted
    const statsResult = await ctx.integrations.apps_database.query(
      `SELECT
        (SELECT COUNT(*) FROM camp201_campers WHERE role != $1)::int as total_campers,
        (SELECT COUNT(*) FROM camp201_team_logo_votes)::int as total_voters`,
      z.object({ total_campers: z.coerce.number(), total_voters: z.coerce.number() }),
      ["counselor"],
      { label: "Count voters" }
    );

    // If all voted, award points to teams
    if (statsResult[0].total_voters >= statsResult[0].total_campers) {
      const ranked = await ctx.integrations.apps_database.query(
        `SELECT team_id, COUNT(*)::int as vote_count
         FROM camp201_team_logo_votes
         GROUP BY team_id
         ORDER BY vote_count DESC
         LIMIT 10`,
        z.object({ team_id: z.coerce.number(), vote_count: z.coerce.number() }),
        undefined,
        { label: "Get final rankings" }
      );

      const pointsMap: Record<number, number> = { 1: 20, 2: 15, 3: 10, 4: 5 };

      // Get active cohort
      const cohortResult = await ctx.integrations.apps_database.query(
        `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
        z.object({ id: z.coerce.number() }),
        undefined,
        { label: "Get active cohort" }
      );
      const cohortId = cohortResult.length > 0 ? cohortResult[0].id : 1;

      for (let i = 0; i < ranked.length; i++) {
        const pts = pointsMap[i + 1] ?? 0;
        if (pts > 0) {
          await ctx.integrations.apps_database.execute(
            `UPDATE camp201_teams SET total_points = total_points + $2 WHERE id = $1`,
            [ranked[i].team_id, pts],
            { label: `Award ${pts} pts to rank ${i + 1}` }
          );
          const placeLabel = i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : '4th';
          await ctx.integrations.apps_database.execute(
            `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, cohort_id)
             SELECT c.id, $2, $3, 'system', $4
             FROM camp201_campers c WHERE c.team_id = $1 LIMIT 10`,
            [ranked[i].team_id, pts, `Logo vote - ${placeLabel} place`, cohortId],
            { label: `Log points for rank ${i + 1}` }
          );
        }
      }

      // Auto-lock voting
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_feature_gates SET is_locked = true WHERE feature_key = $1`,
        ["logo_voting"],
        { label: "Auto-close voting" }
      );

      return { success: true, message: "Vote cast! All votes are in — points have been awarded! 🏆" };
    }

    return { success: true, message: "Vote cast! 🗳️" };
  },
});
