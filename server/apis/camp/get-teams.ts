import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const TeamMemberSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  points: z.coerce.number(),
  photo_url: z.string().nullable(),
});

const TeamSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  logo_url: z.string().nullable(),
  color: z.string().nullable(),
});

export default api({
  name: "GetTeams",
  description: "Fetches all teams with their members and point totals",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    teams: z.array(z.object({
      id: z.number(),
      name: z.string(),
      logo_url: z.string().nullable(),
      color: z.string().nullable(),
      members: z.array(TeamMemberSchema),
      total_points: z.number(),
    })),
  }),
  async run(ctx) {
    const teams = await ctx.integrations.apps_database.query(
      `SELECT id, name, logo_url, color FROM camp201_teams ORDER BY name LIMIT 50`,
      TeamSchema,
      undefined,
      { label: "Fetch all teams" }
    );

    const result = [];
    for (const team of teams) {
      const members = await ctx.integrations.apps_database.query(
        `SELECT id, first_name, last_name, email, points, photo_url
         FROM camp201_campers WHERE team_id = $1 ORDER BY first_name LIMIT 50`,
        TeamMemberSchema,
        [team.id],
        { label: `Fetch members for team ${team.name}` }
      );
      const total_points = members.reduce((sum, m) => sum + m.points, 0);
      result.push({ ...team, members, total_points });
    }

    return { teams: result };
  },
});
