import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, resolveViewCohort } from "../../lib/cohort.js";
import { SpiritWinnerSchema, spiritWinnersSql } from "../../lib/spirit.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const MyVotesSchema = z.object({
  vote_count: z.number(),
  notes: z.array(z.object({ note: z.string().nullable() })),
});

export default api({
  name: "GetSpiritVoteResults",
  description: "Camp Spirit vote progress; winner hidden until the reveal",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    camper_id: z.number(),
  }),
  output: z.object({
    total_votes_cast: z.number(),
    eligible_voters: z.number(),
    /** Winner(s). Empty until cAMP closes and the cAMP-V-P is revealed, so it stays a surprise. */
    winner_ids: z.array(z.number()),
    winners_revealed: z.boolean(),
    my_votes_received: MyVotesSchema.nullable(),
    my_vote_cast: z.object({ nominee_id: z.number() }).nullable(),
    voting_complete: z.boolean(),
  }),
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    // Active cohort for cAMPers; a counselor's chosen past cohort when viewing one.
    const view = await resolveViewCohort(db, ctx.user.email);
    const COHORT = cohortIdSql(view.cohortId);

    const [counts, flags, myVote, votesForMe, notesForMe] = await Promise.all([
      db.query(
        `SELECT
           (SELECT COUNT(*)::int FROM camp201_spirit_votes WHERE cohort_id = ${COHORT}) AS votes,
           (SELECT COUNT(*)::int FROM camp201_campers
             WHERE (role IS NULL OR role NOT IN ('counselor', 'admin'))
               AND removed_at IS NULL AND cohort_id = ${COHORT}) AS eligible`,
        z.object({ votes: z.coerce.number(), eligible: z.coerce.number() }),
        undefined,
        { label: "Count spirit votes and voters" }
      ),
      db.query(
        `SELECT
           COALESCE((SELECT value FROM camp201_config WHERE key = 'camp_closed' LIMIT 1), 'false') = 'true' AS closed,
           COALESCE((SELECT value FROM camp201_config WHERE key = 'vp_revealed' LIMIT 1), 'false') = 'true' AS vp_revealed`,
        z.object({ closed: z.boolean(), vp_revealed: z.boolean() }),
        undefined,
        { label: "Check reveal state" }
      ),
      db.query(
        `SELECT nominee_id FROM camp201_spirit_votes
         WHERE voter_id = $1 AND cohort_id = ${COHORT} LIMIT 1`,
        z.object({ nominee_id: z.number() }),
        [camper_id],
        { label: "Check my spirit vote" }
      ),
      db.query(
        `SELECT COUNT(*)::int as vote_count FROM camp201_spirit_votes
         WHERE nominee_id = $1 AND cohort_id = ${COHORT}`,
        z.object({ vote_count: z.number() }),
        [camper_id],
        { label: "Votes received by me" }
      ),
      db.query(
        `SELECT note FROM camp201_spirit_votes
         WHERE nominee_id = $1 AND cohort_id = ${COHORT} AND note IS NOT NULL AND note != ''
         LIMIT 20`,
        z.object({ note: z.string().nullable() }),
        [camper_id],
        { label: "Notes for me" }
      ),
    ]);

    const totalVotes = counts[0]?.votes ?? 0;
    const eligible = counts[0]?.eligible ?? 0;

    // Revealed with the cAMP-V-P during the podium ceremony (always shown for past cohorts).
    const revealed = view.isPast || (flags[0]?.closed === true && flags[0]?.vp_revealed === true);
    const winners = revealed
      ? await db.query(spiritWinnersSql(COHORT), SpiritWinnerSchema, undefined, { label: "Get Camp Spirit winner" })
      : [];

    return {
      total_votes_cast: totalVotes,
      eligible_voters: eligible,
      winner_ids: winners.map((w) => w.camper_id),
      winners_revealed: revealed,
      my_votes_received: votesForMe.length > 0
        ? { vote_count: votesForMe[0].vote_count, notes: notesForMe }
        : null,
      my_vote_cast: myVote.length > 0 ? { nominee_id: myVote[0].nominee_id } : null,
      voting_complete: totalVotes >= eligible && eligible > 0,
    };
  },
});
