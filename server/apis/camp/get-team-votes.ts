import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetTeamVotes",
  description: "Returns team logo vote counts and whether the current camper has voted",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
  }),
  output: z.object({
    votes: z.array(z.object({
      team_id: z.coerce.number(),
      vote_count: z.coerce.number(),
    })),
    myVote: z.number().nullable(),
    totalVoters: z.coerce.number(),
    totalCampers: z.coerce.number(),
    votingOpen: z.boolean(),
  }),
  async run(ctx, { camper_id }) {
    // Check if voting is open via feature gate (is_locked = false means open)
    const gateResult = await ctx.integrations.apps_database.query(
      `SELECT is_locked FROM camp201_feature_gates WHERE feature_key = $1 LIMIT 1`,
      z.object({ is_locked: z.boolean() }),
      ["logo_voting"],
      { label: "Check logo_voting gate" }
    );
    const votingOpen = gateResult.length > 0 && !gateResult[0].is_locked;

    // Get my vote (table uses user_id column)
    const myVoteResult = await ctx.integrations.apps_database.query(
      `SELECT team_id FROM camp201_team_logo_votes WHERE user_id = $1 LIMIT 1`,
      z.object({ team_id: z.coerce.number() }),
      [camper_id],
      { label: "Get my vote" }
    );
    const myVote = myVoteResult.length > 0 ? myVoteResult[0].team_id : null;

    // Get voting stats in a single query
    const statsResult = await ctx.integrations.apps_database.query(
      `SELECT
        (SELECT COUNT(DISTINCT user_id) FROM camp201_team_logo_votes)::int as total_voters,
        (SELECT COUNT(*) FROM camp201_campers WHERE role != $1)::int as total_campers`,
      z.object({ total_voters: z.coerce.number(), total_campers: z.coerce.number() }),
      ["counselor"],
      { label: "Get voting stats" }
    );
    const totalVoters = statsResult[0]?.total_voters ?? 0;
    const totalCampers = statsResult[0]?.total_campers ?? 0;

    // Votes by team
    const votesResult = await ctx.integrations.apps_database.query(
      `SELECT v.team_id, COUNT(*)::int as vote_count
       FROM camp201_team_logo_votes v
       GROUP BY v.team_id
       ORDER BY vote_count DESC
       LIMIT 20`,
      z.object({ team_id: z.coerce.number(), vote_count: z.coerce.number() }),
      undefined,
      { label: "Get vote counts by team" }
    );

    return { votes: votesResult, myVote, totalVoters, totalCampers, votingOpen };
  },
});
