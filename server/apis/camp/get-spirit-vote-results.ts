import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const WinnerSchema = z.object({
  camper_id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  vote_count: z.number(),
  note_count: z.number(),
});

const MyVotesSchema = z.object({
  vote_count: z.number(),
  notes: z.array(z.object({ note: z.string().nullable() })),
});

export default api({
  name: "GetSpiritVoteResults",
  description: "Gets Camp Spirit vote results and personal vote data",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    camper_id: z.number(),
  }),
  output: z.object({
    total_votes_cast: z.number(),
    winners: z.array(WinnerSchema),
    my_votes_received: MyVotesSchema.nullable(),
    my_vote_cast: z.object({ nominee_id: z.number() }).nullable(),
    voting_complete: z.boolean(),
  }),
  async run(ctx, { camper_id }) {
    // Total votes cast
    const countResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as total FROM camp201_spirit_votes WHERE cohort_id = 1`,
      z.object({ total: z.number() }),
      undefined,
      { label: "Count spirit votes" }
    );
    const totalVotes = countResult[0]?.total ?? 0;

    // Total eligible voters (non-counselors)
    const voterResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as total FROM camp201_campers
       WHERE (role IS NULL OR role NOT IN ('counselor', 'admin'))`,
      z.object({ total: z.number() }),
      undefined,
      { label: "Count eligible voters" }
    );
    const totalEligible = voterResult[0]?.total ?? 0;
    const votingComplete = totalVotes >= totalEligible && totalEligible > 0;

    // Top nominees (ranked by votes, tiebreaker = most notes)
    const winners = await ctx.integrations.apps_database.query(
      `SELECT
         sv.nominee_id as camper_id,
         c.first_name, c.last_name,
         COUNT(*)::int as vote_count,
         COUNT(sv.note)::int as note_count
       FROM camp201_spirit_votes sv
       JOIN camp201_campers c ON c.id = sv.nominee_id
       WHERE sv.cohort_id = 1
       GROUP BY sv.nominee_id, c.first_name, c.last_name
       ORDER BY vote_count DESC, note_count DESC
       LIMIT 10`,
      WinnerSchema,
      undefined,
      { label: "Get spirit vote winners" }
    );

    // Did this camper already vote?
    const myVote = await ctx.integrations.apps_database.query(
      `SELECT nominee_id FROM camp201_spirit_votes
       WHERE voter_id = $1 AND cohort_id = 1 LIMIT 1`,
      z.object({ nominee_id: z.number() }),
      [camper_id],
      { label: "Check my spirit vote" }
    );

    // Votes received by this camper + anonymous notes
    const votesForMe = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as vote_count FROM camp201_spirit_votes
       WHERE nominee_id = $1 AND cohort_id = 1`,
      z.object({ vote_count: z.number() }),
      [camper_id],
      { label: "Votes received by me" }
    );

    const notesForMe = await ctx.integrations.apps_database.query(
      `SELECT note FROM camp201_spirit_votes
       WHERE nominee_id = $1 AND cohort_id = 1 AND note IS NOT NULL AND note != ''
       LIMIT 20`,
      z.object({ note: z.string().nullable() }),
      [camper_id],
      { label: "Notes for me" }
    );

    return {
      total_votes_cast: totalVotes,
      winners,
      my_votes_received: votesForMe.length > 0
        ? { vote_count: votesForMe[0].vote_count, notes: notesForMe }
        : null,
      my_vote_cast: myVote.length > 0 ? { nominee_id: myVote[0].nominee_id } : null,
      voting_complete: votingComplete,
    };
  },
});
