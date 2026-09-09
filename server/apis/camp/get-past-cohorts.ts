import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const MemberSchema = z.object({ id: z.coerce.number(), full_name: z.string(), role: z.string().nullable(), region: z.string().nullable() });
const TeamSchema = z.object({
  id: z.coerce.number(), team_name: z.string(), logo_url: z.string().nullable(), points: z.coerce.number().nullable(),
  points_note: z.string().nullable(), place: z.coerce.number().nullable(), is_winner: z.boolean(), tagline: z.string().nullable(),
  presentation_company: z.string().nullable(), cohort_id: z.coerce.number(),
});
const CohortSchema = z.object({
  id: z.coerce.number(), cohort_number: z.coerce.number(), date_label: z.string(), month: z.string(), year: z.coerce.number(),
  num_teams: z.coerce.number(), has_team_names: z.boolean(), has_logos: z.boolean(), has_points: z.boolean(), notes: z.string().nullable(),
});

export default api({
  name: "GetPastCohorts",
  description: "Fetches all past cohort history with teams and members",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    cohorts: z.array(z.object({
      id: z.number(), cohort_number: z.number(), date_label: z.string(), month: z.string(), year: z.number(),
      num_teams: z.number(), has_team_names: z.boolean(), has_logos: z.boolean(), has_points: z.boolean(), notes: z.string().nullable(),
      teams: z.array(z.object({
        id: z.number(), team_name: z.string(), logo_url: z.string().nullable(), points: z.number().nullable(),
        points_note: z.string().nullable(), place: z.number().nullable(), is_winner: z.boolean(), tagline: z.string().nullable(),
        presentation_company: z.string().nullable(),
        members: z.array(z.object({ id: z.number(), full_name: z.string(), role: z.string().nullable(), region: z.string().nullable() })),
      })),
    })),
  }),
  async run(ctx) {
    const cohorts = await ctx.integrations.apps_database.query(
      "SELECT * FROM camp201_past_cohorts ORDER BY cohort_number DESC",
      CohortSchema, undefined, { label: "Get cohorts" }
    );
    const teams = await ctx.integrations.apps_database.query(
      "SELECT * FROM camp201_past_teams ORDER BY place ASC NULLS LAST, id",
      TeamSchema, undefined, { label: "Get teams" }
    );
    const members = await ctx.integrations.apps_database.query(
      "SELECT * FROM camp201_past_members ORDER BY id",
      MemberSchema, undefined, { label: "Get members" }
    );

    const membersByTeam: Record<number, typeof members> = {};
    for (const m of members) {
      const tid = (m as any).team_id ?? 0;
      if (!membersByTeam[tid]) membersByTeam[tid] = [];
      membersByTeam[tid].push(m);
    }

    // Need team_id in member query
    const MemberWithTeamSchema = z.object({ id: z.coerce.number(), team_id: z.coerce.number(), full_name: z.string(), role: z.string().nullable(), region: z.string().nullable() });
    const membersWithTeam = await ctx.integrations.apps_database.query(
      "SELECT id, team_id, full_name, role, region FROM camp201_past_members ORDER BY id",
      MemberWithTeamSchema, undefined, { label: "Get members with team" }
    );
    const mByTeam: Record<number, Array<{ id: number; full_name: string; role: string | null; region: string | null }>> = {};
    for (const m of membersWithTeam) {
      if (!mByTeam[m.team_id]) mByTeam[m.team_id] = [];
      mByTeam[m.team_id].push({ id: m.id, full_name: m.full_name, role: m.role, region: m.region });
    }

    return {
      cohorts: cohorts.map(c => ({
        ...c,
        teams: teams
          .filter(t => t.cohort_id === c.id)
          .map(t => ({
            id: t.id, team_name: t.team_name, logo_url: t.logo_url, points: t.points,
            points_note: t.points_note, place: t.place, is_winner: t.is_winner, tagline: t.tagline,
            presentation_company: t.presentation_company,
            members: mByTeam[t.id] ?? [],
          })),
      })),
    };
  },
});
