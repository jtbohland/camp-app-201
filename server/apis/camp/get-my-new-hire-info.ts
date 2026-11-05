import { api, z, postgres } from "@superblocksteam/sdk-api";
import { mapToStandardRole } from "../../lib/roles.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetMyNewHireInfo",
  description: "Returns the signed-in person's new-hire CSV details to pre-fill registration",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    found: z.boolean(),
    first_name: z.string().nullable(),
    last_name: z.string().nullable(),
    /** One of the 12 standard roles, or null when the CSV title didn't match. */
    role: z.string().nullable(),
    /** NAMER / EMEA / APAC. */
    region: z.string().nullable(),
    manager_email: z.string().nullable(),
  }),
  async run(ctx) {
    const email = (ctx.user.email ?? "").toLowerCase();
    const empty = { found: false, first_name: null, last_name: null, role: null, region: null, manager_email: null };
    if (!email) return empty;

    const rows = await ctx.integrations.camp_201_db.query(
      `SELECT first_name, last_name, role_title, camp201_map_region(region, NULL) AS region, manager_email
       FROM camp201_new_hires
       WHERE lower(email) = $1
       ORDER BY (cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1)) DESC NULLS LAST,
                updated_at DESC NULLS LAST
       LIMIT 1`,
      z.object({
        first_name: z.string().nullable(),
        last_name: z.string().nullable(),
        role_title: z.string().nullable(),
        region: z.string().nullable(),
        manager_email: z.string().nullable(),
      }),
      [email],
      { label: "Find my new-hire row" }
    );
    const row = rows[0];
    if (!row) return empty;

    return {
      found: true,
      first_name: row.first_name || null,
      last_name: row.last_name || null,
      role: mapToStandardRole(row.role_title),
      region: row.region || null,
      manager_email: row.manager_email || null,
    };
  },
});
