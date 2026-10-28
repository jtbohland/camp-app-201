import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, getActiveCohortId, isCounselorSql, isOnNewHireListSql } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const PersonSchema = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  is_counselor: z.boolean(),
  on_list: z.boolean(),
  list_status: z.string().nullable(),
});

const LeftOutSchema = z.object({
  id: z.number(),
  name: z.string(),
  reason: z.string(),
});

export default api({
  name: "GetTeamGeneratorPreview",
  description: "Counts who the team generator will place, and who it leaves out",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    eligible_count: z.number(),
    accepted_count: z.number(),
    signed_up_not_on_list: z.array(z.object({ id: z.number(), name: z.string() })),
    counselor_count: z.number(),
    left_out: z.array(LeftOutSchema),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const cohortId = await getActiveCohortId(db);
    if (cohortId === null) {
      return { eligible_count: 0, accepted_count: 0, signed_up_not_on_list: [], counselor_count: 0, left_out: [] };
    }
    const cohort = cohortIdSql(cohortId);

    // Same rule as AutoGenerateTeams, worked out per person so we can explain it.
    const people = await db.query(
      `SELECT c.id, c.first_name, c.last_name,
              COALESCE(${isCounselorSql("c")}, false) AS is_counselor,
              ${isOnNewHireListSql("c", cohort)} AS on_list,
              (SELECT nh.status FROM camp201_new_hires nh
                WHERE nh.cohort_id = ${cohort}
                  AND (nh.camper_id = c.id OR lower(nh.email) = lower(c.email))
                ORDER BY (nh.status = 'accepted') DESC, nh.id
                LIMIT 1) AS list_status
       FROM camp201_campers c
       WHERE c.cohort_id = ${cohort}
       ORDER BY lower(c.last_name), lower(c.first_name)
       LIMIT 500`,
      PersonSchema,
      undefined,
      { label: "Check team eligibility per cAMPer" }
    );

    const name = (p: z.infer<typeof PersonSchema>) => `${p.first_name} ${p.last_name}`.trim();
    let acceptedCount = 0;
    let counselorCount = 0;
    const notOnList: { id: number; name: string }[] = [];
    const leftOut: z.infer<typeof LeftOutSchema>[] = [];

    for (const p of people) {
      if (p.is_counselor) {
        counselorCount++;
      } else if (!p.on_list) {
        notOnList.push({ id: p.id, name: name(p) });
      } else if (p.list_status === "accepted") {
        acceptedCount++;
      } else {
        const status = p.list_status ? p.list_status[0].toUpperCase() + p.list_status.slice(1) : "Not accepted";
        leftOut.push({ id: p.id, name: name(p), reason: `${status} on the cohort list` });
      }
    }

    return {
      eligible_count: acceptedCount + notOnList.length,
      accepted_count: acceptedCount,
      signed_up_not_on_list: notOnList,
      counselor_count: counselorCount,
      left_out: leftOut,
    };
  },
});
