import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const LeaderboardTeamSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  logo_url: z.string().nullable(),
  color: z.string().nullable(),
  total_points: z.coerce.number(),
  member_count: z.coerce.number(),
});

const TopContributorSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  points: z.coerce.number(),
  team_id: z.coerce.number().nullable(),
  photo_url: z.string().nullable(),
});

export default api({
  name: "GetLeaderboard",
  description: "Fetches team rankings, top contributors per team, and aMpVP",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    teams: z.array(LeaderboardTeamSchema),
    campers: z.array(z.object({
      id: z.number(), first_name: z.string(), last_name: z.string(), points: z.number(),
      team_name: z.string().nullable(), team_logo_url: z.string().nullable(), team_color: z.string().nullable(),
    })),
    topContributors: z.array(z.object({
      team_id: z.number(),
      team_name: z.string(),
      contributor: TopContributorSchema,
    })),
    mvp: TopContributorSchema.nullable(),
  }),
  async run(ctx) {
    // Team rankings
    const teams = await ctx.integrations.apps_database.query(
      `SELECT t.id, t.name, t.logo_url, t.color,
              COALESCE(SUM(c.points), 0) + COALESCE(t.team_points, 0) as total_points,
              COUNT(c.id) as member_count
       FROM camp201_teams t
       LEFT JOIN camp201_campers c ON c.team_id = t.id
       GROUP BY t.id, t.name, t.logo_url, t.color, t.team_points
       ORDER BY total_points DESC
       LIMIT 20`,
      LeaderboardTeamSchema,
      undefined,
      { label: "Fetch team leaderboard" }
    );

    // Top contributor per team
    const topContributors = [];
    for (const team of teams) {
      const top = await ctx.integrations.apps_database.query(
        `SELECT id, first_name, last_name, points, team_id, photo_url
         FROM camp201_campers
         WHERE team_id = $1
         ORDER BY points DESC
         LIMIT 1`,
        TopContributorSchema,
        [team.id],
        { label: `Top contributor for ${team.name}` }
      );
      if (top.length > 0) {
        topContributors.push({
          team_id: team.id,
          team_name: team.name,
          contributor: top[0],
        });
      }
    }

    // Overall MVP (aMpVP) - top individual earner
    const mvpResult = await ctx.integrations.apps_database.query(
      `SELECT id, first_name, last_name, points, team_id, photo_url
       FROM camp201_campers
       ORDER BY points DESC
       LIMIT 1`,
      TopContributorSchema,
      undefined,
      { label: "Fetch aMpVP" }
    );

    // All campers with team info for cAMP-V-P leaderboard
    const CamperWithTeamSchema = z.object({
      id: z.coerce.number(), first_name: z.string(), last_name: z.string(), points: z.coerce.number(),
      team_name: z.string().nullable(), team_logo_url: z.string().nullable(), team_color: z.string().nullable(),
    });
    const allCampers = await ctx.integrations.apps_database.query(
      `SELECT c.id, c.first_name, c.last_name, c.points,
              t.name as team_name, t.logo_url as team_logo_url, t.color as team_color
       FROM camp201_campers c
       LEFT JOIN camp201_teams t ON c.team_id = t.id
       WHERE c.role != 'counselor' AND c.role != 'admin'
       ORDER BY c.points DESC
       LIMIT 50`,
      CamperWithTeamSchema,
      undefined,
      { label: "All campers for VP leaderboard" }
    );

    return {
      teams,
      campers: allCampers,
      topContributors,
      mvp: mvpResult.length > 0 ? mvpResult[0] : null,
    };
  },
});
