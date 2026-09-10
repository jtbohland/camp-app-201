import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdateNewHireStatus",
  description: "Updates a new hire's status (invited/accepted/declined). On accept, creates camper record.",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    hire_id: z.number(),
    status: z.string(), // invited | accepted | declined
    cohort_id: z.number(),
  }),
  output: z.object({ success: z.boolean(), camper_id: z.coerce.number().nullable() }),
  async run(ctx, { hire_id, status, cohort_id }) {
    const db = ctx.integrations.apps_database;

    // Get the hire
    const hires = await db.query(
      `SELECT * FROM camp201_new_hires WHERE id = $1 LIMIT 1`,
      z.object({
        id: z.coerce.number(),
        first_name: z.string(),
        last_name: z.string(),
        email: z.string(),
        role_title: z.string().nullable(),
        region: z.string().nullable(),
        manager_name: z.string().nullable(),
        manager_email: z.string().nullable(),
        camper_id: z.coerce.number().nullable(),
      }),
      [hire_id],
      { label: "Get hire details" }
    );
    if (hires.length === 0) return { success: false, camper_id: null };

    const hire = hires[0];

    // If accepting, create a camper record (if not already created)
    let camperId = hire.camper_id;
    if (status === "accepted" && !camperId) {
      const result = await db.query(
        `INSERT INTO camp201_campers (first_name, last_name, email, role, cohort_id)
         VALUES ($1, $2, $3, 'camper', $4)
         ON CONFLICT (email) DO UPDATE SET first_name = EXCLUDED.first_name
         RETURNING id`,
        z.object({ id: z.coerce.number() }),
        [hire.first_name, hire.last_name, hire.email, cohort_id],
        { label: "Create camper from accepted hire" }
      );
      camperId = result[0].id;
    }

    // Update status
    await db.execute(
      `UPDATE camp201_new_hires SET status = $2, camper_id = $3, cohort_id = $4, updated_at = NOW() WHERE id = $1`,
      [hire_id, status, camperId, cohort_id],
      { label: "Update hire status" }
    );

    return { success: true, camper_id: camperId };
  },
});
