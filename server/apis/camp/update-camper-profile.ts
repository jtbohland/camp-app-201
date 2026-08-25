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
  name: "UpdateCamperProfile",
  description: "Updates a camper's profile information and awards points if profile is newly completed",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    email: z.string(),
    photo_url: z.string().nullable(),
    bio: z.string().nullable(),
    linkedin_option: z.string(),
    linkedin_url: z.string().nullable(),
    fun_fact: z.string().nullable(),
    goal_1: z.string().nullable(),
    goal_2: z.string().nullable(),
    goal_3: z.string().nullable(),
    ice_breaker_q1: z.string().nullable(),
    ice_breaker_q2: z.string().nullable(),
    ice_breaker_q3: z.string().nullable(),
  }),
  output: z.object({
    camper: CamperSchema,
    pointsAwarded: z.number(),
  }),
  async run(ctx, input) {
    // Check if profile was already completed
    const existing = await ctx.integrations.apps_database.query(
      `SELECT profile_completed FROM camp201_campers WHERE email = $1 LIMIT 1`,
      z.object({ profile_completed: z.boolean() }),
      [input.email],
      { label: "Check existing profile status" }
    );

    const wasAlreadyCompleted = existing.length > 0 && existing[0].profile_completed;

    // Determine if profile is now complete
    const isComplete = !!(input.bio && input.fun_fact && input.goal_1 && input.goal_2 && input.goal_3 && input.ice_breaker_q1 && input.ice_breaker_q2 && input.ice_breaker_q3);

    // Update profile fields
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_campers SET
        photo_url = $2,
        bio = $3,
        linkedin_option = $4,
        linkedin_url = $5,
        fun_fact = $6,
        goal_1 = $7,
        goal_2 = $8,
        goal_3 = $9,
        ice_breaker_q1 = $10,
        ice_breaker_q2 = $11,
        ice_breaker_q3 = $12,
        profile_completed = $13,
        updated_at = NOW()
      WHERE email = $1`,
      [input.email, input.photo_url, input.bio, input.linkedin_option, input.linkedin_url, input.fun_fact, input.goal_1, input.goal_2, input.goal_3, input.ice_breaker_q1, input.ice_breaker_q2, input.ice_breaker_q3, isComplete],
      { label: "Update camper profile" }
    );

    // Award points for profile completion (only once)
    let pointsAwarded = 0;
    if (isComplete && !wasAlreadyCompleted) {
      pointsAwarded = 15;
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + 15 WHERE email = $1`,
        [input.email],
        { label: "Award profile completion points" }
      );
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
         SELECT id, 15, 'Profile completed', 'system'
         FROM camp201_campers WHERE email = $1`,
        [input.email],
        { label: "Log profile completion points" }
      );
    }

    // Fetch and return updated camper
    const campers = await ctx.integrations.apps_database.query(
      `SELECT * FROM camp201_campers WHERE email = $1 LIMIT 1`,
      CamperSchema,
      [input.email],
      { label: "Fetch updated camper" }
    );

    return { camper: campers[0], pointsAwarded };
  },
});
