import { api, z, postgres } from "@superblocksteam/sdk-api";
import { resolveViewCohort } from "../../lib/cohort.js";
import { getStandings } from "../../lib/cohort-snapshot.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetMyStanding",
  description: "Returns the signed-in cAMPer's place, team, and team place",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    found: z.boolean(),
    is_counselor: z.boolean(),
    points: z.number(),
    rank: z.number().nullable(),
    total_campers: z.number(),
    team: z
      .object({
        id: z.number(),
        name: z.string(),
        logo_url: z.string().nullable(),
        color: z.string().nullable(),
        rank: z.number(),
        total_points: z.number(),
      })
      .nullable(),
    total_teams: z.number(),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const email = (ctx.user.email ?? "").toLowerCase();
    const view = await resolveViewCohort(db, email);
    const { people, campers, teams } = await getStandings(db, view);

    const me = people.find((p) => (p.email ?? "").toLowerCase() === email);
    const empty = {
      found: false, is_counselor: false, points: 0, rank: null,
      total_campers: campers.length, team: null, total_teams: teams.length,
    };
    if (!me) return empty;

    // Ties share a place (e.g. two cAMPers on 40 pts are both #3).
    const rankIdx = campers.findIndex((c) => c.points === me.points);
    const rank = me.is_counselor || rankIdx < 0 ? null : rankIdx + 1;

    const teamIdx = me.team_id !== null ? teams.findIndex((t) => t.id === me.team_id) : -1;
    const myTeam = teamIdx >= 0 ? teams[teamIdx] : null;
    const teamRankIdx = myTeam ? teams.findIndex((t) => t.total_points === myTeam.total_points) : -1;

    return {
      found: true,
      is_counselor: me.is_counselor,
      points: me.points,
      rank,
      total_campers: campers.length,
      team: myTeam
        ? {
            id: myTeam.id, name: myTeam.name, logo_url: myTeam.logo_url, color: myTeam.color,
            rank: teamRankIdx + 1, total_points: myTeam.total_points,
          }
        : null,
      total_teams: teams.length,
    };
  },
});
