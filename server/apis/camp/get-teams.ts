import { api, z, postgres } from "@superblocksteam/sdk-api";
import { ACTIVE_COHORT_ID_SQL } from "../../lib/cohort.js";

const CAMP_201_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

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
  assigned_company: z.any().nullable(),
});

export default api({
  name: "GetTeams",
  description: "Fetches active cohort's teams with members and points",
  integrations: {
    camp_201_db: postgres(CAMP_201_DB),
  },
  input: z.object({}),
  output: z.object({
    teams: z.array(z.object({
      id: z.number(),
      name: z.string(),
      logo_url: z.string().nullable(),
      color: z.string().nullable(),
      assigned_company: z.any().nullable(),
      members: z.array(TeamMemberSchema),
      total_points: z.number(),
    })),
  }),
  async run(ctx) {
    const teams = await ctx.integrations.camp_201_db.query(
      `SELECT id, name, logo_url, color, assigned_company, COALESCE(team_points, 0) as team_points FROM camp201_teams WHERE cohort_id = ${ACTIVE_COHORT_ID_SQL} ORDER BY name LIMIT 50`,
      TeamSchema.extend({ team_points: z.coerce.number() }),
      undefined,
      { label: "Fetch active cohort teams" }
    );

    const result = [];
    for (const team of teams) {
      const members = await ctx.integrations.camp_201_db.query(
        `SELECT id, first_name, last_name, email, points, photo_url,
                (role IN ('counselor', 'admin')) AS is_counselor
         FROM camp201_campers WHERE team_id = $1 ORDER BY first_name LIMIT 50`,
        TeamMemberSchema.extend({ is_counselor: z.boolean().nullable() }),
        [team.id],
        { label: `Fetch members for team ${team.name}` }
      );
      // Counselors can sit on a team but don't count toward the score (matches leaderboard + Close cAMP).
      const total_points =
        members.reduce((sum, m) => sum + (m.is_counselor ? 0 : m.points), 0) + team.team_points;
      const { team_points: _tp, ...teamFields } = team;
      result.push({
        ...teamFields,
        members: members.map(({ is_counselor: _c, ...m }) => m),
        total_points,
      });
    }

    return { teams: result };
  },
});
