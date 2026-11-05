import { api, z, postgres } from "@superblocksteam/sdk-api";
import { STANDARD_ROLES } from "../../lib/roles.js";

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
  name: "RegisterCamper",
  description: "Registers a new cAMPer and awards initial registration points",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    /** One of the 12 standard roles. */
    role: z.enum(STANDARD_ROLES),
    manager: z.string().nullable(),
    // Manager's work email: links this cAMPer to their manager's dashboard
    manager_email: z.string().trim().toLowerCase().email().max(200).nullable(),
    region: z.string().nullable(),
    country: z.string().nullable(),
    city: z.string().nullable(),
    start_date: z.string().nullable(),
  }),
  output: z.object({
    camper: CamperSchema,
    pointsAwarded: z.number(),
    /** True when this person had been removed: they're saved but wait for a counselor to restore them. */
    pendingApproval: z.boolean(),
  }),
  async run(ctx, input) {
    // Get active cohort
    const CohortIdSchema = z.object({ id: z.coerce.number() });
    const activeCohort = await ctx.integrations.camp_201_db.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortIdSchema,
      undefined,
      { label: "Get active cohort" }
    );
    const cohortId = activeCohort.length > 0 ? activeCohort[0].id : null;

    // The role from the counselor's new-hire CSV, so a change can be flagged in Cohort Management.
    const csvRows = await ctx.integrations.camp_201_db.query(
      `SELECT role_title FROM camp201_new_hires
       WHERE lower(email) = lower($1) AND role_needs_review = false AND role_title IS NOT NULL
       ORDER BY (cohort_id = $2) DESC NULLS LAST, updated_at DESC NULLS LAST
       LIMIT 1`,
      z.object({ role_title: z.string() }),
      [input.email, cohortId],
      { label: "Look up CSV role" }
    );
    const csvRole = csvRows[0]?.role_title ?? null;

    // Check if already registered — prevents double points
    const existing = await ctx.integrations.camp_201_db.query(
      `SELECT id, points, (removed_at IS NOT NULL) AS is_removed FROM camp201_campers WHERE email = $1 LIMIT 1`,
      z.object({ id: z.coerce.number(), points: z.coerce.number(), is_removed: z.boolean() }),
      [input.email],
      { label: "Check existing registration" }
    );

    if (existing.length > 0) {
      // Already registered — update info but DON'T award points again.
      // A removed cAMPer registering again stays hidden and is flagged for a counselor to restore.
      const isRemoved = existing[0].is_removed;
      await ctx.integrations.camp_201_db.execute(
        `UPDATE camp201_campers SET
           first_name = $2, last_name = $3,
           role = CASE WHEN role IN ('counselor', 'admin') THEN role ELSE $4 END,
           manager = $5,
           region = $6, country = $7, city = $8, start_date = $9::date,
           manager_email = COALESCE($10, manager_email),
           csv_role = COALESCE($11, csv_role),
           role_needs_review = false,
           rejoin_requested_at = CASE WHEN removed_at IS NOT NULL THEN NOW() ELSE NULL END,
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
          input.manager_email ?? null,
          csvRole,
        ],
        { label: "Update existing camper info" }
      );

      const campers = await ctx.integrations.camp_201_db.query(
        `SELECT * FROM camp201_campers WHERE email = $1 LIMIT 1`,
        CamperSchema,
        [input.email],
        { label: "Fetch updated camper" }
      );
      return { camper: campers[0], pointsAwarded: 0, pendingApproval: isRemoved };
    }

    // Generate unique 4-digit PIN
    let pin: string = "";
    let pinUnique = false;
    while (!pinUnique) {
      pin = String(Math.floor(1000 + Math.random() * 9000)); // 1000-9999
      const PinCheckSchema = z.object({ count: z.coerce.number() });
      const pinCheck = await ctx.integrations.camp_201_db.query(
        `SELECT COUNT(*) as count FROM camp201_campers WHERE pin = $1`,
        PinCheckSchema,
        [pin],
        { label: "Check PIN uniqueness" }
      );
      if (pinCheck[0].count === 0) pinUnique = true;
    }

    // New registration: insert with initial points + PIN + cohort
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_campers (email, first_name, last_name, role, manager, region, country, city, start_date, points, pin, cohort_id, manager_email, csv_role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::date, 10, $10, $11, $12, $13)`,
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
        pin,
        cohortId,
        input.manager_email ?? null,
        csvRole,
      ],
      { label: "Register new cAMPer with PIN + cohort" }
    );

    // Fetch the camper to get the ID
    const campers = await ctx.integrations.camp_201_db.query(
      `SELECT * FROM camp201_campers WHERE email = $1 LIMIT 1`,
      CamperSchema,
      [input.email],
      { label: "Fetch registered camper" }
    );

    const camper = campers[0];

    // Log the registration points (only once — new registrations only)
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, cohort_id)
       VALUES ($1, 10, 'Registration completed', 'system', $2)
       ON CONFLICT DO NOTHING`,
      [camper.id, cohortId],
      { label: "Award registration points" }
    );

    return { camper, pointsAwarded: 10, pendingApproval: false };
  },
});
