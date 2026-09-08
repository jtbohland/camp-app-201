import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const CohortCamperSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  email: z.string(),
});

export default api({
  name: "GetCohortCampersForManager",
  description: "Gets list of registered cAMPers in active cohort for manager hire selection",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    campers: z.array(CohortCamperSchema),
  }),
  async run(ctx) {
    const campers = await ctx.integrations.apps_database.query(
      `SELECT c.id, c.first_name, c.last_name, c.role, c.email
       FROM camp201_campers c
       JOIN camp201_cohorts co ON co.id = c.cohort_id AND co.is_active = true
       WHERE c.role NOT IN ('counselor', 'admin')
       ORDER BY c.last_name, c.first_name
       LIMIT 200`,
      CohortCamperSchema,
      undefined,
      { label: "Get cohort campers for manager selection" }
    );
    return { campers };
  },
});
