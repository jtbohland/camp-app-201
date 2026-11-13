import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const CamperSchema = z.object({
  id: z.coerce.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  manager: z.string().nullable(),
  manager_email: z.string().nullable(),
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
    camp_201_db: postgres(APPS_DB),
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
    ice_breaker_answers: z.string().nullable(),
    // Manager's work email (blank clears it). Lowercased so it matches the manager's sign-in email.
    manager_email: z
      .string()
      .trim()
      .toLowerCase()
      .max(200)
      .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid manager email")
      .nullable(),
  }),
  output: z.object({
    camper: CamperSchema,
    pointsAwarded: z.number(),
    /** Profile was completed after the pre-work deadline: saved, for 0 points. */
    pastDeadline: z.boolean(),
  }),
  async run(ctx, input) {
    // Always save the signed-in cAMPer's own row (never trust the email sent from the browser),
    // matched case-insensitively so "Hayley.A@" and "hayley.a@" are the same person.
    const signedIn = (ctx.user.email ?? "").trim().toLowerCase();
    if (!signedIn) throw new Error("You're signed out. Refresh the page and sign in again.");
    if (input.email && input.email.trim().toLowerCase() !== signedIn) {
      throw new Error("You can only edit your own profile.");
    }

    const existing = await ctx.integrations.camp_201_db.query(
      `SELECT id, profile_completed,
              (role IN ('counselor', 'admin')) AS is_counselor,
              (btrim(COALESCE(first_name, '')) <> '' AND btrim(COALESCE(last_name, '')) <> ''
               AND btrim(COALESCE(role, '')) NOT IN ('', 'camper')
               AND btrim(COALESCE(manager_email, '')) <> '' AND btrim(COALESCE(region, '')) <> ''
               AND btrim(COALESCE(country, '')) <> '' AND btrim(COALESCE(city, '')) <> ''
               AND start_date IS NOT NULL AND btrim(COALESCE(pin, '')) <> '') AS registration_done
       FROM camp201_campers
       WHERE lower(email) = $1 AND removed_at IS NULL
       ORDER BY id DESC LIMIT 1`,
      z.object({ id: z.coerce.number(), profile_completed: z.boolean(), is_counselor: z.boolean(), registration_done: z.boolean() }),
      [signedIn],
      { label: "Find signed-in cAMPer" }
    );
    if (!existing[0]) throw new Error("We couldn't find your cAMPer profile. Refresh the page and try again.");
    // Registration comes first: no profile (or profile points) until every registration field is filled.
    if (!existing[0].is_counselor && !existing[0].registration_done) {
      throw new Error("Finish your registration first. Refresh the page to see what's missing.");
    }
    const camperId = existing[0].id;
    const wasAlreadyCompleted = existing[0].profile_completed;

    // Determine if profile is now complete
    let iceBreakerAnswers: Record<string, string> = {};
    try {
      const parsed = input.ice_breaker_answers ? JSON.parse(input.ice_breaker_answers) : {};
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) iceBreakerAnswers = parsed;
    } catch {
      iceBreakerAnswers = {};
    }
    const iceBreakerKeys = Object.keys(iceBreakerAnswers).filter((k) => typeof iceBreakerAnswers[k] === "string" && iceBreakerAnswers[k].trim());
    const iceBreakerComplete = iceBreakerKeys.length >= 16;
    const isComplete = !!(input.bio && input.fun_fact && input.goal_1 && input.goal_2 && input.goal_3 && iceBreakerComplete);

    // Update profile fields
    await ctx.integrations.camp_201_db.execute(
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
        ice_breaker_answers = $14::jsonb,
        -- Manager email is a required registration field: a profile save can change it, never blank it.
        manager_email = COALESCE(NULLIF($15, ''), manager_email),
        updated_at = NOW()
      WHERE id = $1`,
      [camperId, input.photo_url, input.bio, input.linkedin_option, input.linkedin_url, input.fun_fact, input.goal_1, input.goal_2, input.goal_3, input.ice_breaker_q1, input.ice_breaker_q2, input.ice_breaker_q3, isComplete, JSON.stringify(iceBreakerAnswers), input.manager_email ?? ""],
      { label: "Update camper profile" }
    );

    // Profile completion: +15 once, only before the pre-work deadline (Monday 9:00 AM PT by default).
    // The point-log entry adds to the total (database trigger). Re-checked against the log so a
    // profile that was complete before (and edited since) never earns twice.
    let pointsAwarded = 0;
    let pastDeadline = false;
    if (isComplete) {
      const awarded = await ctx.integrations.camp_201_db.query(
        `WITH due AS (
           SELECT (camp201_prework_deadline() IS NOT NULL AND NOW() >= camp201_prework_deadline()) AS past,
                  EXISTS (SELECT 1 FROM camp201_points_log WHERE camper_id = $1 AND reason = 'Profile completed') AS had
         ), ins AS (
           INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
           SELECT $1, 15, 'Profile completed', 'system', 'profile'
           FROM due WHERE NOT due.past AND NOT due.had
           RETURNING points
         )
         SELECT (SELECT past FROM due) AS past, (SELECT had FROM due) AS had,
                COALESCE((SELECT SUM(points) FROM ins), 0)::int AS pts`,
        z.object({ past: z.boolean(), had: z.boolean(), pts: z.coerce.number() }),
        [camperId],
        { label: "Award profile completion points" }
      );
      pointsAwarded = awarded[0]?.pts ?? 0;
      pastDeadline = !wasAlreadyCompleted && !awarded[0]?.had && awarded[0]?.past === true;
    }

    // Fetch and return updated camper
    const campers = await ctx.integrations.camp_201_db.query(
      `SELECT * FROM camp201_campers WHERE id = $1 LIMIT 1`,
      CamperSchema,
      [camperId],
      { label: "Fetch updated camper" }
    );

    return { camper: campers[0], pointsAwarded, pastDeadline };
  },
});
