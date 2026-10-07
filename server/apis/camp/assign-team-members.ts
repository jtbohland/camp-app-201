import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, isCounselorSql } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "AssignTeamMembers",
  description: "Assigns campers to a team by updating their team_id",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    team_id: z.number(),
    camper_ids: z.array(z.number()),
  }),
  output: z.object({
    success: z.boolean(),
    assigned: z.number(),
  }),
  async run(ctx, { team_id, camper_ids }) {
    await assertNotViewingPast(ctx.integrations.camp_201_db, ctx.user.email);
    // Reassign these campers to the team. Counselors are skipped — they never join a team.
    if (camper_ids.length === 0) return { success: true, assigned: 0 };
    const updated = await ctx.integrations.camp_201_db.query(
      `WITH u AS (
         UPDATE camp201_campers c SET team_id = $1
         WHERE c.id = ANY($2::int[]) AND NOT ${isCounselorSql("c")}
         RETURNING c.id
       )
       SELECT COUNT(*)::int AS n FROM u`,
      z.object({ n: z.coerce.number() }),
      [team_id, camper_ids],
      { label: "Assign campers to team" }
    );

    return { success: true, assigned: updated[0]?.n ?? 0 };
  },
});
