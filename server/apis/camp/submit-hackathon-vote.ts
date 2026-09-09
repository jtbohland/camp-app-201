import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SubmitHackathonVote",
  description: "Cast a vote for best hackathon project (can't vote for own team)",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    camper_id: z.number(),
    team_id: z.number(),
  }),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx, { presentation_id, camper_id, team_id }) {
    // Check voter's team — can't vote for own
    const camper = await ctx.integrations.apps_database.query(
      `SELECT team_id FROM camp201_campers WHERE id = $1 LIMIT 1`,
      z.object({ team_id: z.coerce.number().nullable() }),
      [camper_id],
      { label: "Get voter team" }
    );
    if (camper.length > 0 && camper[0].team_id === team_id) {
      return { success: false, message: "Can't vote for your own team! 🙅" };
    }

    // Check if already voted
    const existing = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_hackathon_votes
       WHERE presentation_id = $1 AND voter_camper_id = $2 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [presentation_id, camper_id],
      { label: "Check existing vote" }
    );
    if (existing.length > 0) {
      return { success: false, message: "You've already voted!" };
    }

    // Cast vote
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_hackathon_votes (presentation_id, voter_camper_id, voted_for_team_id)
       VALUES ($1, $2, $3)`,
      [presentation_id, camper_id, team_id],
      { label: "Cast hackathon vote" }
    );

    // Check if all campers have voted → award points
    const totalCampers = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*) AS cnt FROM camp201_campers WHERE role NOT IN ('counselor', 'admin') LIMIT 1`,
      z.object({ cnt: z.coerce.number() }),
      undefined,
      { label: "Count campers" }
    );
    const totalVotes = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*) AS cnt FROM camp201_hackathon_votes WHERE presentation_id = $1 LIMIT 1`,
      z.object({ cnt: z.coerce.number() }),
      [presentation_id],
      { label: "Count votes" }
    );

    if (totalVotes[0].cnt >= totalCampers[0].cnt) {
      // Award points: 1st=+20, 2nd=+15, 3rd=+10, 4th=+5
      const ranked = await ctx.integrations.apps_database.query(
        `SELECT voted_for_team_id, COUNT(*) AS votes
         FROM camp201_hackathon_votes WHERE presentation_id = $1
         GROUP BY voted_for_team_id ORDER BY votes DESC LIMIT 10`,
        z.object({ voted_for_team_id: z.coerce.number(), votes: z.coerce.number() }),
        [presentation_id],
        { label: "Rank teams" }
      );

      const pointTiers = [20, 15, 10, 5];
      for (let i = 0; i < ranked.length; i++) {
        const pts = pointTiers[i] ?? 3;
        await ctx.integrations.apps_database.execute(
          `UPDATE camp201_teams SET total_points = total_points + $2 WHERE id = $1`,
          [ranked[i].voted_for_team_id, pts],
          { label: `Award ${pts}pts to rank ${i + 1}` }
        );
      }
    }

    return { success: true, message: "Vote cast! 🗳️" };
  },
});
