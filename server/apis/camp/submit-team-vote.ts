import { api, z, postgres } from "@superblocksteam/sdk-api";
import { ACTIVE_COHORT_ID_SQL, getActiveCohortId } from "../../lib/cohort.js";
import { finalizeLogoVote } from "../../lib/logo-vote.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "SubmitTeamVote",
  description: "Casts a logo vote; closes voting once everyone has voted",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    team_id: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
    message: z.string(),
  }),
  async run(ctx, { camper_id, team_id }) {
    const db = ctx.integrations.camp_201_db;

    // Voting is open while the gate is unlocked.
    const gateResult = await db.query(
      `SELECT is_locked FROM camp201_feature_gates WHERE feature_key = $1 LIMIT 1`,
      z.object({ is_locked: z.boolean() }),
      ["logo_voting"],
      { label: "Check logo_voting gate" }
    );
    if (gateResult.length === 0 || gateResult[0].is_locked) {
      return { success: false, message: "Logo voting is not open right now" };
    }

    // The team must belong to the active cohort, and cAMPers can't vote for their own team.
    const teamCheck = await db.query(
      `SELECT
         (SELECT team_id FROM camp201_campers WHERE id = $1 LIMIT 1) AS my_team,
         EXISTS (SELECT 1 FROM camp201_teams WHERE id = $2 AND cohort_id = ${ACTIVE_COHORT_ID_SQL}) AS team_ok`,
      z.object({ my_team: z.coerce.number().nullable(), team_ok: z.boolean() }),
      [camper_id, team_id],
      { label: "Check team and camper" }
    );
    if (!teamCheck[0]?.team_ok) {
      return { success: false, message: "That team isn't in this cohort" };
    }
    if (teamCheck[0].my_team === team_id) {
      return { success: false, message: "You can't vote for your own team!" };
    }

    // One vote per cAMPer.
    const existing = await db.query(
      `SELECT id FROM camp201_team_logo_votes WHERE user_id = $1 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [camper_id],
      { label: "Check existing vote" }
    );
    if (existing.length > 0) {
      return { success: false, message: "You've already cast your vote!" };
    }

    await db.execute(
      `INSERT INTO camp201_team_logo_votes (user_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [camper_id, team_id],
      { label: "Cast vote" }
    );

    // Once every cAMPer has voted, close voting and award points automatically.
    const stats = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM camp201_campers
          WHERE role NOT IN ('counselor', 'admin') AND cohort_id = ${ACTIVE_COHORT_ID_SQL})::int AS total_campers,
        (SELECT COUNT(DISTINCT v.user_id) FROM camp201_team_logo_votes v
           JOIN camp201_teams t ON t.id = v.team_id
          WHERE t.cohort_id = ${ACTIVE_COHORT_ID_SQL})::int AS total_voters`,
      z.object({ total_campers: z.coerce.number(), total_voters: z.coerce.number() }),
      undefined,
      { label: "Count voters" }
    );
    const { total_campers, total_voters } = stats[0] ?? { total_campers: 0, total_voters: 0 };

    if (total_campers > 0 && total_voters >= total_campers) {
      const cohortId = await getActiveCohortId(db);
      if (cohortId !== null) {
        const result = await finalizeLogoVote(db, cohortId);
        if (result.finalized) {
          return { success: true, message: "Vote cast! All votes are in — points have been awarded! 🏆" };
        }
      }
    }

    return { success: true, message: "Vote cast! 🗳️" };
  },
});
