import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";
const INNOVATION_BADGE_ID = 12;
const TEAM_POINTS = 15;

export default api({
  name: "CloseHackathon",
  description: "Closes hackathon voting, awards team points + Innovation badge to winning team",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    presentation_id: z.number(),
    awarded_by: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
    winning_team_id: z.number(),
    winning_team_name: z.string(),
    team_points: z.number(),
    members_awarded: z.number(),
  }),
  async run(ctx, { presentation_id, awarded_by }) {
    // Find the winning team (most votes)
    const winners = await ctx.integrations.apps_database.query(
      `SELECT hs.team_id, t.name as team_name, COALESCE(v.vote_count, 0) as vote_count
       FROM camp201_hackathon_submissions hs
       JOIN camp201_teams t ON t.id = hs.team_id
       LEFT JOIN (
         SELECT voted_for_team_id, COUNT(*) as vote_count
         FROM camp201_hackathon_votes WHERE presentation_id = $1
         GROUP BY voted_for_team_id
       ) v ON v.voted_for_team_id = hs.team_id
       WHERE hs.presentation_id = $1
       ORDER BY vote_count DESC
       LIMIT 1`,
      z.object({ team_id: z.number(), team_name: z.string(), vote_count: z.coerce.number() }),
      [presentation_id],
      { label: "Find hackathon winner" }
    );

    if (winners.length === 0) throw new Error("No submissions found");
    const winner = winners[0];

    // Get all members of the winning team
    const members = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_campers WHERE team_id = $1 LIMIT 20`,
      z.object({ id: z.number() }),
      [winner.team_id],
      { label: "Get winning team members" }
    );

    // Award Innovation badge to each member (skip if already awarded)
    for (const m of members) {
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_camper_badges (camper_id, badge_id, awarded_by)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [m.id, INNOVATION_BADGE_ID, awarded_by]
      );
    }

    // Award team points: split TEAM_POINTS evenly among members
    const perMember = Math.floor(TEAM_POINTS / members.length);
    const remainder = TEAM_POINTS % members.length;

    for (let i = 0; i < members.length; i++) {
      const pts = perMember + (i < remainder ? 1 : 0);
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
        [pts, members[i].id]
      );
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
         VALUES ($1, $2, $3, $4)`,
        [members[i].id, pts, `AI Hackathon Winner - ${winner.team_name}`, awarded_by]
      );
    }

    return {
      success: true,
      winning_team_id: winner.team_id,
      winning_team_name: winner.team_name,
      team_points: TEAM_POINTS,
      members_awarded: members.length,
    };
  },
});
