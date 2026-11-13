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
    /** Registration fields still blank (plain labels for the "finish registration" modal). */
    missingRegistration: z.array(z.string()),
    /** Profile items still blank (plain labels). Empty when the profile is complete. */
    missingProfile: z.array(z.string()),
  }),
  async run(ctx, { email }) {
    const campers = await ctx.integrations.camp_201_db.query(
      `SELECT * FROM camp201_campers WHERE email = $1 LIMIT 1`,
      CamperSchema,
      [email],
      { label: "Fetch current camper by email" }
    );

    if (campers.length === 0) {
      return { camper: null, isRegistered: false, isRemoved: false, rejoinPending: false, needsRegistration: false, missingRegistration: [], missingProfile: [] };
    }

    // Removed cAMPers are treated as not registered everywhere in the app.
    const camper = campers[0];
    if (camper.removed_at) {
      return { camper: null, isRegistered: false, isRemoved: true, rejoinPending: !!camper.rejoin_requested_at, needsRegistration: false, missingRegistration: [], missingProfile: [] };
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
    const missingRegistration = isCounselor
      ? []
      : ([
          blank(camper.first_name) && "First name",
          blank(camper.last_name) && "Last name",
          (blank(camper.role) || camper.role === "camper") && "Role",
          blank(camper.manager_email) && "Manager's work email",
          blank(camper.region) && "Region",
          blank(camper.country) && "Country",
          blank(camper.city) && "City",
          blank(camper.start_date) && "Start date",
          // The PIN is generated for them when they save registration.
          blank(camper.pin) && "Check-in PIN",
        ].filter(Boolean) as string[]);
    const needsRegistration = missingRegistration.length > 0;

    // Profile: bio, fun fact, three goals, and all 16 ice breaker questions.
    const answers = camper.ice_breaker_answers && typeof camper.ice_breaker_answers === "object" ? (camper.ice_breaker_answers as Record<string, unknown>) : {};
    const answered = Object.values(answers).filter((v) => typeof v === "string" && v.trim()).length;
    const iceLeft = Math.max(0, 16 - answered);
    const missingProfile = isCounselor || camper.profile_completed
      ? []
      : ([
          blank(camper.bio) && "Bio",
          blank(camper.fun_fact) && "Fun fact",
          blank(camper.goal_1) && "Goal 1",
          blank(camper.goal_2) && "Goal 2",
          blank(camper.goal_3) && "Goal 3",
          iceLeft > 0 && `${iceLeft} ice breaker question${iceLeft === 1 ? "" : "s"}`,
        ].filter(Boolean) as string[]);
    // Flag says incomplete but every field is filled: they just need to press Save.
    if (!isCounselor && !camper.profile_completed && missingProfile.length === 0) missingProfile.push("Save your profile");

    return { camper, isRegistered: true, isRemoved: false, rejoinPending: false, needsRegistration, missingRegistration, missingProfile };
  },
});
