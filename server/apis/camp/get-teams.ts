import { api, z, postgres } from "@superblocksteam/sdk-api";
import { resolveViewCohort } from "../../lib/cohort.js";
import { getStandings } from "../../lib/cohort-snapshot.js";

const CAMP_201_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const TeamMemberSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  points: z.number(),
  photo_url: z.string().nullable(),
});

export default api({
  name: "GetTeams",
  description: "Fetches the viewed cohort's teams with members and points",
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
    const db = ctx.integrations.camp_201_db;
    const view = await resolveViewCohort(db, ctx.user.email);
    const { people, teams } = await getStandings(db, view);

    // Counselors can sit on a team but don't count toward the score (matches leaderboard + Close cAMP).
    const result = [...teams]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((t) => ({
        id: t.id,
        name: t.name,
        logo_url: t.logo_url,
        color: t.color,
        assigned_company: t.assigned_company ?? null,
        members: people
          .filter((p) => p.team_id === t.id)
          .sort((a, b) => a.first_name.localeCompare(b.first_name))
          .map((p) => ({
            id: p.id, first_name: p.first_name, last_name: p.last_name,
            email: p.email, points: p.points, photo_url: p.photo_url,
          })),
        total_points: t.total_points,
      }));

    return { teams: result };
  },
});
