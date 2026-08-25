import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const CamperOptionSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  team_id: z.coerce.number().nullable(),
});

export default api({
  name: "GetRegisteredCampers",
  description: "Fetches all registered campers for team assignment dropdown",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    campers: z.array(CamperOptionSchema),
  }),
  async run(ctx) {
    const campers = await ctx.integrations.apps_database.query(
      `SELECT id, first_name, last_name, email, team_id
       FROM camp201_campers
       ORDER BY first_name, last_name
       LIMIT 100`,
      CamperOptionSchema,
      undefined,
      { label: "Fetch registered campers for dropdown" }
    );

    return { campers };
  },
});
