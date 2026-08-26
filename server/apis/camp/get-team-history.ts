import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const TeamHistorySchema = z.object({
  id: z.coerce.number(),
  team_name: z.string(),
  logo_url: z.string().nullable(),
  mascot: z.string().nullable(),
  color_hex: z.string().nullable(),
  cohort_name: z.string(),
  cohort_year: z.coerce.number(),
  members_count: z.coerce.number(),
  final_points: z.coerce.number(),
  placement: z.coerce.number().nullable(),
});

export default api({
  name: "GetTeamHistory",
  description: "Gets all historical team names/logos from past cohorts for inspiration and dedup",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    search: z.string().nullable(),
  }),
  output: z.object({
    teams: z.array(TeamHistorySchema),
    all_names: z.array(z.string()),
  }),
  async run(ctx, { search }) {
    // Get all team names for dedup checking
    const NameSchema = z.object({ team_name: z.string() });
    const allNames = await ctx.integrations.apps_database.query(
      `SELECT DISTINCT team_name FROM camp201_team_history ORDER BY team_name LIMIT 200`,
      NameSchema,
      undefined,
      { label: "Get all historical team names" }
    );

    // Also get current active team names
    const currentNames = await ctx.integrations.apps_database.query(
      `SELECT name as team_name FROM camp201_teams LIMIT 50`,
      NameSchema,
      undefined,
      { label: "Get current team names" }
    );

    const combined = [...new Set([...allNames.map(n => n.team_name), ...currentNames.map(n => n.team_name)])];

    // Get filtered history
    const query = search
      ? `SELECT id, team_name, logo_url, mascot, color_hex, cohort_name, cohort_year, members_count, final_points, placement
         FROM camp201_team_history
         WHERE team_name ILIKE $1 OR mascot ILIKE $1 OR cohort_name ILIKE $1
         ORDER BY cohort_year DESC, placement ASC NULLS LAST LIMIT 50`
      : `SELECT id, team_name, logo_url, mascot, color_hex, cohort_name, cohort_year, members_count, final_points, placement
         FROM camp201_team_history
         ORDER BY cohort_year DESC, placement ASC NULLS LAST LIMIT 50`;

    const teams = await ctx.integrations.apps_database.query(
      query,
      TeamHistorySchema,
      search ? [`%${search}%`] : undefined,
      { label: "Get team history" }
    );

    return { teams, all_names: combined };
  },
});
