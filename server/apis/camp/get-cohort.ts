import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const CohortMemberSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  manager: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  photo_url: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  fun_fact: z.string().nullable(),
  points: z.coerce.number(),
  team_id: z.coerce.number().nullable(),
  team_name: z.string().nullable(),
  team_color: z.string().nullable(),
  team_logo_url: z.string().nullable(),
});

export default api({
  name: "GetCohort",
  description: "Fetches all registered campers for the cohort directory",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    members: z.array(CohortMemberSchema),
  }),
  async run(ctx) {
    const members = await ctx.integrations.apps_database.query(
      `SELECT c.id, c.first_name, c.last_name, c.email, c.role, c.manager,
              c.region, c.country, c.city, c.photo_url, c.linkedin_url, c.fun_fact,
              c.points, c.team_id,
              t.name as team_name, t.color as team_color, t.logo_url as team_logo_url
       FROM camp201_campers c
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       ORDER BY
         CASE WHEN c.role IN ('counselor', 'admin') THEN 0 ELSE 1 END,
         c.first_name, c.last_name
       LIMIT 100`,
      CohortMemberSchema,
      undefined,
      { label: "Fetch cohort directory" }
    );

    return { members };
  },
});
