import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, resolveViewCohort } from "../../lib/cohort.js";
import { getCohortSnapshot } from "../../lib/cohort-snapshot.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const CohortMemberSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  manager: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  photo_url: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  bio: z.string().nullable(),
  fun_fact: z.string().nullable(),
  points: z.coerce.number(),
  start_date: z.string().nullable(),
  team_id: z.coerce.number().nullable(),
  team_name: z.string().nullable(),
  team_color: z.string().nullable(),
  team_logo_url: z.string().nullable(),
});

const MEMBER_COLUMNS = `c.id, c.first_name, c.last_name, c.email, c.role, c.manager,
  c.region, c.country, c.city, c.photo_url, c.linkedin_url, c.bio, c.fun_fact,
  c.points, c.team_id, c.start_date,
  t.name as team_name, t.color as team_color, t.logo_url as team_logo_url`;

const MEMBER_ORDER = `ORDER BY
  CASE WHEN c.role IN ('counselor', 'admin') THEN 0 ELSE 1 END,
  c.first_name, c.last_name`;

export default api({
  name: "GetCohort",
  description: "Lists the viewed cohort's cAMPers and counselors",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    members: z.array(CohortMemberSchema),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const view = await resolveViewCohort(db, ctx.user.email);
    if (view.cohortId === null) return { members: [] };
    const cohortId = cohortIdSql(view.cohortId);

    // Past cohort: counselors move to each new cohort, so use the list saved when it ended.
    if (view.isPast) {
      const snapshot = await getCohortSnapshot(db, view.cohortId);
      const counselorIds = snapshot?.counselor_ids ?? [];
      const members = await db.query(
        `SELECT ${MEMBER_COLUMNS}
         FROM camp201_campers c
         LEFT JOIN camp201_teams t ON t.id = c.team_id
         WHERE (c.cohort_id = ${cohortId} AND c.role NOT IN ('counselor', 'admin'))
            OR c.id = ANY($1::int[])
         ${MEMBER_ORDER}
         LIMIT 200`,
        CohortMemberSchema,
        [counselorIds],
        { label: "Fetch past cohort directory" }
      );
      return { members };
    }

    const members = await db.query(
      `SELECT ${MEMBER_COLUMNS}
       FROM camp201_campers c
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       WHERE c.cohort_id = ${cohortId}
       ${MEMBER_ORDER}
       LIMIT 200`,
      CohortMemberSchema,
      undefined,
      { label: "Fetch active cohort directory" }
    );

    return { members };
  },
});
