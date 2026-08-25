import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const CamperSchema = z.object({
  id: z.coerce.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  manager: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  start_date: z.string().nullable(),
  photo_url: z.string().nullable(),
  bio: z.string().nullable(),
  linkedin_option: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  fun_fact: z.string().nullable(),
  goal_1: z.string().nullable(),
  goal_2: z.string().nullable(),
  goal_3: z.string().nullable(),
  goal_1_achieved: z.boolean(),
  goal_2_achieved: z.boolean(),
  goal_3_achieved: z.boolean(),
  ice_breaker_q1: z.string().nullable(),
  ice_breaker_q2: z.string().nullable(),
  ice_breaker_q3: z.string().nullable(),
  profile_completed: z.boolean(),
  points: z.coerce.number(),
  team_id: z.coerce.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export default api({
  name: "GetCurrentCamper",
  description: "Fetches the current logged-in camper's registration and profile data",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    email: z.string(),
  }),
  output: z.object({
    camper: CamperSchema.nullable(),
    isRegistered: z.boolean(),
  }),
  async run(ctx, { email }) {
    const campers = await ctx.integrations.apps_database.query(
      `SELECT * FROM camp201_campers WHERE email = $1 LIMIT 1`,
      CamperSchema,
      [email],
      { label: "Fetch current camper by email" }
    );

    if (campers.length === 0) {
      return { camper: null, isRegistered: false };
    }

    return { camper: campers[0], isRegistered: true };
  },
});
