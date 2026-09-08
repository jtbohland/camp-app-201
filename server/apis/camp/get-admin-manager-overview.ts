import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ManagerOverviewSchema = z.object({
  id: z.coerce.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  title: z.string(),
  region: z.string(),
  hire_count: z.coerce.number(),
  comment_count: z.coerce.number(),
  last_viewed_at: z.string().nullable(),
  created_at: z.string(),
});

const ManagerCommentDetailSchema = z.object({
  id: z.coerce.number(),
  manager_first_name: z.string(),
  manager_last_name: z.string(),
  camper_first_name: z.string(),
  camper_last_name: z.string(),
  comment_type: z.string(),
  sentiment: z.string(),
  content: z.string(),
  created_at: z.string(),
});

export default api({
  name: "GetAdminManagerOverview",
  description: "Gets all managers with their hires, comments, and activity for admin view",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    managers: z.array(ManagerOverviewSchema),
    recent_comments: z.array(ManagerCommentDetailSchema),
  }),
  async run(ctx) {
    const managers = await ctx.integrations.apps_database.query(
      `SELECT m.id, m.email, m.first_name, m.last_name, m.title, m.region,
              (SELECT COUNT(*) FROM camp201_manager_hires mh WHERE mh.manager_id = m.id)::integer as hire_count,
              (SELECT COUNT(*) FROM camp201_manager_comments mc WHERE mc.manager_id = m.id)::integer as comment_count,
              m.last_viewed_at::text,
              m.created_at::text
       FROM camp201_managers m
       ORDER BY m.created_at DESC
       LIMIT 100`,
      ManagerOverviewSchema,
      undefined,
      { label: "Get all managers overview" }
    );

    const recentComments = await ctx.integrations.apps_database.query(
      `SELECT mc.id,
              m.first_name as manager_first_name, m.last_name as manager_last_name,
              c.first_name as camper_first_name, c.last_name as camper_last_name,
              mc.comment_type, mc.sentiment, mc.content, mc.created_at::text
       FROM camp201_manager_comments mc
       JOIN camp201_managers m ON m.id = mc.manager_id
       JOIN camp201_campers c ON c.id = mc.camper_id
       ORDER BY mc.created_at DESC
       LIMIT 50`,
      ManagerCommentDetailSchema,
      undefined,
      { label: "Get recent manager comments" }
    );

    return { managers, recent_comments: recentComments };
  },
});
