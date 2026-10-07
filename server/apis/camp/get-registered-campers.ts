import { api, z, postgres } from "@superblocksteam/sdk-api";
import { ACTIVE_COHORT_ID_SQL } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const CamperOptionSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  team_id: z.coerce.number().nullable(),
});

export default api({
  name: "GetRegisteredCampers",
  description: "Fetches active cohort cAMPers for team dropdowns",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    campers: z.array(CamperOptionSchema),
  }),
  async run(ctx) {
    const campers = await ctx.integrations.camp_201_db.query(
      `SELECT id, first_name, last_name, email, team_id
       FROM camp201_campers
       WHERE cohort_id = ${ACTIVE_COHORT_ID_SQL}
       ORDER BY first_name, last_name
       LIMIT 100`,
      CamperOptionSchema,
      undefined,
      { label: "Fetch registered campers for dropdown" }
    );

    return { campers };
  },
});
