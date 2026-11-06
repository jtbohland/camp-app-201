import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, getActiveCohortId, isCounselorSql, requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "AssignTeamMembers",
  description: "Counselor moves cAMPers onto a team, or off all teams",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    /** Team to move them onto. Null takes them off their team. */
    team_id: z.number().nullable(),
    camper_ids: z.array(z.number()).max(100),
  }),
  output: z.object({
    success: z.boolean(),
    assigned: z.number(),
  }),
  async run(ctx, { team_id, camper_ids }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    if (camper_ids.length === 0) return { success: true, assigned: 0 };

    const cohortId = await getActiveCohortId(db);
    if (cohortId === null) throw new Error("No active cohort.");

    if (team_id !== null) {
      const team = await db.query(
        `SELECT id FROM camp201_teams WHERE id = $1 AND cohort_id = $2 LIMIT 1`,
        z.object({ id: z.coerce.number() }),
        [team_id, cohortId],
        { label: "Check team is in the active cohort" }
      );
      if (team.length === 0) throw new Error("That team isn't in the active cohort.");
    }

    // Only cAMPers in the active cohort move. Counselors never join a team.
    const updated = await db.query(
      `WITH u AS (
         UPDATE camp201_campers c SET team_id = $1
         WHERE c.id = ANY($2::int[]) AND c.cohort_id = $3 AND c.removed_at IS NULL
           AND NOT ${isCounselorSql("c")}
         RETURNING c.id
       )
       SELECT COUNT(*)::int AS n FROM u`,
      z.object({ n: z.coerce.number() }),
      [team_id, camper_ids, cohortId],
      { label: team_id === null ? "Take cAMPers off their team" : "Move cAMPers to team" }
    );

    return { success: true, assigned: updated[0]?.n ?? 0 };
  },
});
