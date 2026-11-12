import { api, z, postgres } from "@superblocksteam/sdk-api";
import { ACTIVE_COHORT_ID_SQL, isCounselorSql } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const CamperOptionSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  team_id: z.coerce.number().nullable(),
  /** The team's chosen name, or "Team N" (by creation order) until they pick one. */
  team_name: z.string().nullable(),
  is_counselor: z.boolean(),
});

export default api({
  name: "GetRegisteredCampers",
  description: "Fetches active cohort cAMPers, flagging counselors",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    campers: z.array(CamperOptionSchema),
  }),
  async run(ctx) {
    const campers = await ctx.integrations.camp_201_db.query(
      `WITH teams AS (
         SELECT t.id,
                COALESCE(NULLIF(btrim(t.name), ''),
                         'Team ' || ROW_NUMBER() OVER (PARTITION BY t.cohort_id ORDER BY t.created_at, t.id)) AS team_name
         FROM camp201_teams t
         WHERE t.cohort_id = ${ACTIVE_COHORT_ID_SQL}
       )
       SELECT c.id, c.first_name, c.last_name, c.email, c.team_id, tm.team_name,
              COALESCE(${isCounselorSql("c")}, false) AS is_counselor
       FROM camp201_campers c
       LEFT JOIN teams tm ON tm.id = c.team_id
       WHERE c.cohort_id = ${ACTIVE_COHORT_ID_SQL}
       ORDER BY c.first_name, c.last_name
       LIMIT 500`,
      CamperOptionSchema,
      undefined,
      { label: "Fetch registered campers for dropdown" }
    );

    return { campers };
  },
});
