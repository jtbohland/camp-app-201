import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetCurrentManager",
  description: "Checks if current user is a registered manager and returns their data",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    email: z.string(),
  }),
  output: z.object({
    isManager: z.boolean(),
    manager: z.object({
      id: z.coerce.number(),
      first_name: z.string(),
      last_name: z.string(),
      title: z.string(),
      region: z.string(),
      hire_count: z.coerce.number(),
    }).nullable(),
  }),
  async run(ctx, input) {
    const ManagerSchema = z.object({
      id: z.coerce.number(),
      first_name: z.string(),
      last_name: z.string(),
      title: z.string(),
      region: z.string(),
      hire_count: z.coerce.number(),
    });

    const managers = await ctx.integrations.apps_database.query(
      `SELECT m.id, m.first_name, m.last_name, m.title, m.region,
              (SELECT COUNT(*) FROM camp201_manager_hires mh WHERE mh.manager_id = m.id)::integer as hire_count
       FROM camp201_managers m
       WHERE m.email = $1
       LIMIT 1`,
      ManagerSchema,
      [input.email],
      { label: "Check if user is a manager" }
    );

    if (managers.length === 0) {
      return { isManager: false, manager: null };
    }

    return { isManager: true, manager: managers[0] };
  },
});
