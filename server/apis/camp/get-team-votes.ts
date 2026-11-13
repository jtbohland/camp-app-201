import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, resolveViewCohort } from "../../lib/cohort.js";
import { isLogoVoteFinalized } from "../../lib/logo-vote.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetTeamVotes",
  description: "Returns logo vote counts, status, and the camper's vote",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
  }),
  output: z.object({
    votes: z.array(z.object({
      team_id: z.coerce.number(),
      vote_count: z.coerce.number(),
    })),
    myVote: z.number().nullable(),
    totalVoters: z.coerce.number(),
    totalCampers: z.coerce.number(),
    votingOpen: z.boolean(),
    /** Voting closed and points awarded: results stay visible from here on. */
    finalized: z.boolean(),
    bestLogoTeamIds: z.array(z.number()),
  }),
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    // Active cohort for cAMPers; a counselor's chosen past cohort when viewing one.
    const { cohortId } = await resolveViewCohort(db, ctx.user.email);
    const VIEW = cohortIdSql(cohortId);

    const gateResult = await db.query(
      `SELECT is_locked FROM camp201_feature_gates WHERE feature_key = $1 LIMIT 1`,
      z.object({ is_locked: z.boolean() }),
      ["logo_voting"],
      { label: "Check logo_voting gate" }
    );
    const finalized = await isLogoVoteFinalized(db, cohortId);
    const votingOpen = !finalized && gateResult.length > 0 && !gateResult[0].is_locked;

    // My vote in this cohort.
    const myVoteResult = await db.query(
      `SELECT v.team_id FROM camp201_team_logo_votes v
       JOIN camp201_teams t ON t.id = v.team_id
       WHERE v.user_id = $1 AND t.cohort_id = ${VIEW} LIMIT 1`,
      z.object({ team_id: z.coerce.number() }),
      [camper_id],
      { label: "Get my vote" }
    );
    const myVote = myVoteResult.length > 0 ? myVoteResult[0].team_id : null;

    const statsResult = await db.query(
      `SELECT
        (SELECT COUNT(DISTINCT v.user_id) FROM camp201_team_logo_votes v
           JOIN camp201_teams t ON t.id = v.team_id
          WHERE t.cohort_id = ${VIEW})::int as total_voters,
        (SELECT COUNT(*) FROM camp201_campers
          WHERE role NOT IN ('counselor', 'admin') AND cohort_id = ${VIEW})::int as total_campers`,
      z.object({ total_voters: z.coerce.number(), total_campers: z.coerce.number() }),
      undefined,
      { label: "Get voting stats" }
    );

    const votesResult = await db.query(
      `SELECT v.team_id, COUNT(*)::int as vote_count
       FROM camp201_team_logo_votes v
       JOIN camp201_teams t ON t.id = v.team_id
       WHERE t.cohort_id = ${VIEW}
       GROUP BY v.team_id
       ORDER BY vote_count DESC
       LIMIT 20`,
      z.object({ team_id: z.coerce.number(), vote_count: z.coerce.number() }),
      undefined,
      { label: "Get vote counts by team" }
    );

    const best = await db.query(
      `SELECT id FROM camp201_teams WHERE cohort_id = ${VIEW} AND best_logo LIMIT 10`,
      z.object({ id: z.coerce.number() }),
      undefined,
      { label: "Get Best Logo team" }
    );

    return {
      votes: votesResult,
      myVote,
      totalVoters: statsResult[0]?.total_voters ?? 0,
      totalCampers: statsResult[0]?.total_campers ?? 0,
      votingOpen,
      finalized,
      bestLogoTeamIds: best.map((b) => b.id),
    };
  },
});
