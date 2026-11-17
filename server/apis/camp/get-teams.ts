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
  role: z.string().nullable(),
  country: z.string().nullable(),
});

const ProfileRow = z.object({
  id: z.coerce.number(),
  role: z.string().nullable(),
  country: z.string().nullable(),
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
      /** Size-fair team score (average member pts × standard team size + team pts). */
      total_points: z.number(),
      /** Plain sum before the size adjustment. */
      raw_points: z.number(),
      size_adjusted: z.boolean(),
      standard_size: z.number(),
      member_count: z.number(),
    })),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const view = await resolveViewCohort(db, ctx.user.email);
    const { people, teams } = await getStandings(db, view);

    // Role + country for the name pills (flag + role color). Looked up live by id so past cohorts work too.
    const memberIds = people.filter((p) => p.team_id !== null).map((p) => p.id);
    const profiles = memberIds.length
      ? await db.query(
          `SELECT id, role, country FROM camp201_campers WHERE id = ANY($1::int[]) LIMIT 500`,
          ProfileRow,
          [memberIds],
          { label: "Member roles and countries" }
        )
      : [];
    const profileById = new Map(profiles.map((r: z.infer<typeof ProfileRow>) => [r.id, r]));

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
          // Most points first; ties alphabetical so the order is stable.
          .sort((a, b) => b.points - a.points || a.first_name.localeCompare(b.first_name))
          .map((p) => ({
            id: p.id, first_name: p.first_name, last_name: p.last_name,
            email: p.email, points: p.points, photo_url: p.photo_url,
            role: profileById.get(p.id)?.role ?? null,
            country: profileById.get(p.id)?.country ?? null,
          })),
        total_points: t.total_points,
        raw_points: t.raw_points,
        size_adjusted: t.size_adjusted,
        standard_size: t.standard_size,
        member_count: t.member_count,
      }));

    return { teams: result };
  },
});
