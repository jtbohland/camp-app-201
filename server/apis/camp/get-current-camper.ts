import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const CamperSchema = z.object({
  id: z.coerce.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  manager: z.string().nullable(),
  manager_email: z.string().nullable().optional(),
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
  ice_breaker_answers: z.any().nullable(),
  flight_departure_date: z.string().nullable(),
  flight_departure_time: z.string().nullable(),
  leave_office_by: z.string().nullable(),
  flight_is_local: z.boolean().nullable(),
  pin: z.string().nullable(),
  profile_completed: z.boolean(),
  points: z.coerce.number(),
  team_id: z.coerce.number().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  removed_at: z.string().nullable().optional(),
  rejoin_requested_at: z.string().nullable().optional(),
  last_seen_at: z.string().nullable().optional(),
  dietary_options: z.array(z.string()).nullable().optional(),
  dietary_notes: z.string().nullable().optional(),
});

export default api({
  name: "GetCurrentCamper",
  description: "Fetches the current logged-in camper's registration and profile data",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    email: z.string(),
  }),
  output: z.object({
    camper: CamperSchema.nullable(),
    isRegistered: z.boolean(),
    /** A counselor removed this person. They can register again but stay hidden until restored. */
    isRemoved: z.boolean(),
    /** Removed, re-registered, and waiting for a counselor to restore them. */
    rejoinPending: z.boolean(),
    /**
     * Has an account but is missing required registration details (e.g. a counselor marked them
     * Accepted, which creates the account before they ever saw the form). They must finish the form.
     */
    needsRegistration: z.boolean(),
  }),
  async run(ctx, { email }) {
    const campers = await ctx.integrations.camp_201_db.query(
      `SELECT * FROM camp201_campers WHERE email = $1 LIMIT 1`,
      CamperSchema,
      [email],
      { label: "Fetch current camper by email" }
    );

    if (campers.length === 0) {
      return { camper: null, isRegistered: false, isRemoved: false, rejoinPending: false, needsRegistration: false };
    }

    // Removed cAMPers are treated as not registered everywhere in the app.
    const camper = campers[0];
    if (camper.removed_at) {
      return { camper: null, isRegistered: false, isRemoved: true, rejoinPending: !!camper.rejoin_requested_at, needsRegistration: false };
    }

    // Last login: only when the signed-in person opens their own record, at most every 5 minutes.
    const isSelf = (ctx.user.email ?? "").trim().toLowerCase() === (camper.email ?? "").trim().toLowerCase();
    if (isSelf) {
      const bumped = await ctx.integrations.camp_201_db.query(
        `WITH u AS (
           UPDATE camp201_campers SET last_seen_at = NOW()
           WHERE id = $1 AND (last_seen_at IS NULL OR last_seen_at < NOW() - INTERVAL '5 minutes')
           RETURNING last_seen_at::text AS last_seen_at
         )
         SELECT last_seen_at FROM u LIMIT 1`,
        z.object({ last_seen_at: z.string() }),
        [camper.id],
        { label: "Record last login" }
      );
      if (bumped[0]) camper.last_seen_at = bumped[0].last_seen_at;
    }

    // Every registration field is required. Counselors never register this way.
    const blank = (v: string | null | undefined) => !(v ?? "").trim();
    const isCounselor = camper.role === "counselor" || camper.role === "admin";
    const needsRegistration = !isCounselor && (
      blank(camper.first_name) || blank(camper.last_name) ||
      blank(camper.role) || camper.role === "camper" ||
      blank(camper.manager_email) || blank(camper.region) || blank(camper.country) ||
      blank(camper.city) || blank(camper.start_date) || blank(camper.pin)
    );

    return { camper, isRegistered: true, isRemoved: false, rejoinPending: false, needsRegistration };
  },
});
