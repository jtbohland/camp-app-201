import { api, z, postgres } from "@superblocksteam/sdk-api";
import { resolveViewCohort } from "../../lib/cohort.js";
import { getStandings } from "../../lib/cohort-snapshot.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const LeaderboardTeamSchema = z.object({
  id: z.number(),
  name: z.string(),
  logo_url: z.string().nullable(),
  color: z.string().nullable(),
  total_points: z.number(),
  member_count: z.number(),
});

const TopContributorSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  points: z.number(),
  team_id: z.number().nullable(),
  photo_url: z.string().nullable(),
});

export default api({
  name: "GetLeaderboard",
  description: "Fetches team rankings, top contributors per team, and aMpVP",
  integrations: {
    camp_201_db: postgres(APPS_DB),
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
    const db = ctx.integrations.camp_201_db;
    // Active cohort for cAMPers; a counselor's chosen past cohort uses its as-of-close snapshot.
    const view = await resolveViewCohort(db, ctx.user.email);
    const { campers, teams } = await getStandings(db, view);

    const toContributor = (c: (typeof campers)[number]) => ({
      id: c.id, first_name: c.first_name, last_name: c.last_name,
      points: c.points, team_id: c.team_id, photo_url: c.photo_url,
    });
    const teamById = new Map(teams.map((t) => [t.id, t]));

    const topContributors = teams.flatMap((t) => {
      const top = campers.find((c) => c.team_id === t.id);
      return top ? [{ team_id: t.id, team_name: t.name, contributor: toContributor(top) }] : [];
    });

    return {
      teams: teams.slice(0, 20).map((t) => ({
        id: t.id, name: t.name, logo_url: t.logo_url, color: t.color,
        total_points: t.total_points, member_count: t.member_count,
      })),
      campers: campers.slice(0, 50).map((c) => {
        const team = c.team_id !== null ? teamById.get(c.team_id) : undefined;
        return {
          id: c.id, first_name: c.first_name, last_name: c.last_name, points: c.points,
          team_name: team?.name ?? null, team_logo_url: team?.logo_url ?? null, team_color: team?.color ?? null,
        };
      }),
      topContributors,
      mvp: campers.length > 0 ? toContributor(campers[0]) : null,
    };
  },
});
