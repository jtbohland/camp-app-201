import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ManagerSchema = z.object({
  id: z.coerce.number(),
  email: z.string(),
  first_name: z.string(),
  last_name: z.string(),
  title: z.string(),
  region: z.string(),
  cohort_id: z.coerce.number().nullable(),
  created_at: z.string(),
});

const CamperOptionSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  role: z.string(),
  email: z.string(),
});

export default api({
  name: "RegisterManager",
  description: "Registers a manager and links them to selected hires",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    email: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    title: z.string(),
    region: z.string().nullable(),
    hire_ids: z.array(z.number()),
  }),
  output: z.object({
    manager: ManagerSchema,
    hires_linked: z.number(),
  }),
  async run(ctx, input) {
    // Get active cohort
    const CohortIdSchema = z.object({ id: z.coerce.number() });
    const activeCohort = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortIdSchema,
      undefined,
      { label: "Get active cohort" }
    );
    const cohortId = activeCohort.length > 0 ? activeCohort[0].id : null;

    // Check if already registered (upsert)
    const existing = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_managers WHERE email = $1 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [input.email],
      { label: "Check existing manager" }
    );

    let managerId: number;

    if (existing.length > 0) {
      managerId = existing[0].id;
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_managers SET
           first_name = $2, last_name = $3, title = $4, region = $5,
           cohort_id = $6, updated_at = NOW()
         WHERE id = $1`,
        [managerId, input.first_name, input.last_name, input.title, input.region ?? "", cohortId],
        { label: "Update existing manager" }
      );
    } else {
      // Insert new manager and get ID
      const inserted = await ctx.integrations.apps_database.query(
        `INSERT INTO camp201_managers (email, first_name, last_name, title, region, cohort_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        z.object({ id: z.coerce.number() }),
        [input.email, input.first_name, input.last_name, input.title, input.region ?? "", cohortId],
        { label: "Insert new manager" }
      );
      managerId = inserted[0].id;
    }

    // Link hires (upsert to avoid duplicates)
    let linkedCount = 0;
    for (const camperIdVal of input.hire_ids) {
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_manager_hires (manager_id, camper_id)
         VALUES ($1, $2)
         ON CONFLICT (manager_id, camper_id) DO NOTHING`,
        [managerId, camperIdVal],
        { label: `Link hire ${camperIdVal}` }
      );
      linkedCount++;
    }

    const manager = await ctx.integrations.apps_database.query(
      `SELECT id, email, first_name, last_name, title, region, cohort_id, created_at
       FROM camp201_managers WHERE id = $1 LIMIT 1`,
      ManagerSchema,
      [managerId],
      { label: "Fetch registered manager" }
    );

    return { manager: manager[0], hires_linked: linkedCount };
  },
});
