import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "AddTeamHistory",
  description: "Adds a historical team entry for past cohorts",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    team_name: z.string(),
    logo_url: z.string().nullable(),
    mascot: z.string().nullable(),
    color_hex: z.string().nullable(),
    cohort_name: z.string(),
    cohort_year: z.number(),
    members_count: z.number(),
    final_points: z.number(),
    placement: z.number().nullable(),
  }),
  output: z.object({ success: z.boolean(), id: z.number() }),
  async run(ctx, input) {
    const InsertSchema = z.object({ id: z.coerce.number() });
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_team_history (team_name, logo_url, mascot, color_hex, cohort_name, cohort_year, members_count, final_points, placement)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      InsertSchema,
      [input.team_name, input.logo_url, input.mascot, input.color_hex, input.cohort_name, input.cohort_year, input.members_count, input.final_points, input.placement],
      { label: "Add team history" }
    );

    return { success: true, id: result[0].id };
  },
});
