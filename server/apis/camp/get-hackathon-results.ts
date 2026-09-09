import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetHackathonResults",
  description: "Gets all hackathon submissions and vote tallies",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({ presentation_id: z.number(), camper_id: z.number() }),
  output: z.object({
    submissions: z.array(z.object({
      team_id: z.coerce.number(),
      team_name: z.string(),
      team_color: z.string().nullable(),
      app_name: z.string(),
      description: z.string(),
      use_case: z.string(),
      how_it_works: z.string(),
      who_uses_it: z.string(),
      app_link: z.string(),
      vote_count: z.coerce.number(),
    })),
    my_vote_team_id: z.number().nullable(),
    total_voters: z.coerce.number(),
    total_campers: z.coerce.number(),
  }),
  async run(ctx, { presentation_id, camper_id }) {
    const submissions = await ctx.integrations.apps_database.query(
      `SELECT hs.team_id, t.name AS team_name, t.color AS team_color,
              hs.app_name, hs.description, hs.use_case, hs.how_it_works, hs.who_uses_it,
              COALESCE(hs.app_link, '') AS app_link,
              COALESCE(v.vote_count, 0) AS vote_count
       FROM camp201_hackathon_submissions hs
       JOIN camp201_teams t ON t.id = hs.team_id
       LEFT JOIN (
         SELECT voted_for_team_id, COUNT(*) AS vote_count
         FROM camp201_hackathon_votes WHERE presentation_id = $1
         GROUP BY voted_for_team_id
       ) v ON v.voted_for_team_id = hs.team_id
       WHERE hs.presentation_id = $1
       ORDER BY vote_count DESC, hs.app_name
       LIMIT 20`,
      z.object({
        team_id: z.coerce.number(), team_name: z.string(), team_color: z.string().nullable(),
        app_name: z.string(), description: z.string(), use_case: z.string(),
        how_it_works: z.string(), who_uses_it: z.string(), app_link: z.string(),
        vote_count: z.coerce.number(),
      }),
      [presentation_id],
      { label: "Get hackathon submissions + votes" }
    );

    const myVoteRows = await ctx.integrations.apps_database.query(
      `SELECT voted_for_team_id FROM camp201_hackathon_votes
       WHERE presentation_id = $1 AND voter_camper_id = $2 LIMIT 1`,
      z.object({ voted_for_team_id: z.coerce.number() }),
      [presentation_id, camper_id],
      { label: "Check my vote" }
    );

    const voterCount = await ctx.integrations.apps_database.query(
      `SELECT COUNT(DISTINCT voter_camper_id) AS cnt FROM camp201_hackathon_votes WHERE presentation_id = $1 LIMIT 1`,
      z.object({ cnt: z.coerce.number() }),
      [presentation_id],
      { label: "Count voters" }
    );

    const camperCount = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*) AS cnt FROM camp201_campers WHERE role NOT IN ('counselor', 'admin') LIMIT 1`,
      z.object({ cnt: z.coerce.number() }),
      undefined,
      { label: "Count campers" }
    );

    return {
      submissions,
      my_vote_team_id: myVoteRows.length > 0 ? myVoteRows[0].voted_for_team_id : null,
      total_voters: voterCount[0]?.cnt ?? 0,
      total_campers: camperCount[0]?.cnt ?? 0,
    };
  },
});
