import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ActivitySchema = z.object({
  camper_id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  team_name: z.string(),
  contribution_count: z.coerce.number(),
  last_contribution: z.string().nullable(),
});

export default api({
  name: "GetHubActivity",
  description: "Admin view of hub contributions across all teams",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    activity: z.array(ActivitySchema),
  }),
  async run(ctx) {
    const activity = await ctx.integrations.apps_database.query(
      `SELECT h.author_id as camper_id,
              c.first_name, c.last_name,
              COALESCE(t.name, 'Unassigned') as team_name,
              COUNT(h.id) as contribution_count,
              MAX(h.created_at)::text as last_contribution
       FROM camp201_hub_items h
       JOIN camp201_campers c ON c.id = h.author_id
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       GROUP BY h.author_id, c.first_name, c.last_name, t.name
       ORDER BY contribution_count DESC
       LIMIT 100`,
      ActivitySchema,
      undefined,
      { label: "Fetch hub activity for admin" }
    );

    return { activity };
  },
});
