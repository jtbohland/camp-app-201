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
  name: "RegisterCamper",
  description: "Registers a new cAMPer and awards initial registration points",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    role: z.string(),
    manager: z.string().nullable(),
    region: z.string().nullable(),
    country: z.string().nullable(),
    city: z.string().nullable(),
    start_date: z.string().nullable(),
  }),
  output: z.object({
    camper: CamperSchema,
    pointsAwarded: z.number(),
  }),
  async run(ctx, input) {
    // Check if already registered — prevents double points
    const existing = await ctx.integrations.apps_database.query(
      `SELECT id, points FROM camp201_campers WHERE email = $1 LIMIT 1`,
      z.object({ id: z.coerce.number(), points: z.coerce.number() }),
      [input.email],
      { label: "Check existing registration" }
    );

    if (existing.length > 0) {
      // Already registered — update info but DON'T award points again
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET
           first_name = $2, last_name = $3, role = $4, manager = $5,
           region = $6, country = $7, city = $8, start_date = $9::date,
           updated_at = NOW()
         WHERE email = $1`,
        [
          input.email,
          input.first_name,
          input.last_name,
          input.role,
          input.manager ?? "",
          input.region ?? "",
          input.country ?? "",
          input.city ?? "",
          input.start_date ?? null,
        ],
        { label: "Update existing camper info" }
      );

      const campers = await ctx.integrations.apps_database.query(
        `SELECT * FROM camp201_campers WHERE email = $1 LIMIT 1`,
        CamperSchema,
        [input.email],
        { label: "Fetch updated camper" }
      );
      return { camper: campers[0], pointsAwarded: 0 };
    }

    // New registration: insert with initial points
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_campers (email, first_name, last_name, role, manager, region, country, city, start_date, points)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, 10)`,
      [
        input.email,
        input.first_name,
        input.last_name,
        input.role,
        input.manager ?? "",
        input.region ?? "",
        input.country ?? "",
        input.city ?? "",
        input.start_date ?? null,
      ],
      { label: "Register new cAMPer" }
    );

    // Fetch the camper to get the ID
    const campers = await ctx.integrations.apps_database.query(
      `SELECT * FROM camp201_campers WHERE email = $1 LIMIT 1`,
      CamperSchema,
      [input.email],
      { label: "Fetch registered camper" }
    );

    const camper = campers[0];

    // Log the registration points (only once — new registrations only)
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
       VALUES ($1, 10, 'Registration completed', 'system')
       ON CONFLICT DO NOTHING`,
      [camper.id],
      { label: "Award registration points" }
    );

    return { camper, pointsAwarded: 10 };
  },
});
