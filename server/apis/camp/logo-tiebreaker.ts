import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, getActiveCohortId, getCounselorAccess, resolveViewCohort } from "../../lib/cohort.js";
import { applyTiebreakWinner, getTiebreakTeamIds } from "../../lib/logo-vote.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const TiebreakOutput = z.object({
  /** True when cAMPers tied for 1st and counselors break the tie. */
  active: z.boolean(),
  teams: z.array(z.object({ id: z.number(), name: z.string(), logo_url: z.string().nullable(), color: z.string().nullable(), votes: z.number() })),
  my_vote: z.number().nullable(),
  votes_cast: z.number(),
  counselors: z.number(),
  winner_team_id: z.number().nullable(),
});

/** The counselor tie-breaker for Best Logo (counselors only see vote details). */
export const GetLogoTiebreaker = api({
  name: "GetLogoTiebreaker",
  description: "Gets the counselor Best Logo tie-breaker status",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: TiebreakOutput,
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const email = (ctx.user.email ?? "").toLowerCase();
    const empty = { active: false, teams: [], my_vote: null, votes_cast: 0, counselors: 0, winner_team_id: null };
    const access = await getCounselorAccess(db, email);
    if (!access.isAdmin || access.isGuestJudge) return empty;
    const { cohortId } = await resolveViewCohort(db, email);
    if (cohortId === null) return empty;

    const teamIds = await getTiebreakTeamIds(db, cohortId);
    if (teamIds.length < 2) return empty;

    const [teams, mine, counts] = await Promise.all([
      db.query(
        `SELECT t.id, t.name, t.logo_url, t.color,
                (SELECT COUNT(*) FROM camp201_logo_tiebreak_votes v WHERE v.cohort_id = $1 AND v.team_id = t.id)::int AS votes,
                t.best_logo
         FROM camp201_teams t WHERE t.id = ANY($2::int[]) ORDER BY t.name LIMIT 10`,
        z.object({
          id: z.coerce.number(), name: z.string(), logo_url: z.string().nullable(), color: z.string().nullable(),
          votes: z.coerce.number(), best_logo: z.boolean().nullable(),
        }),
        [cohortId, teamIds],
        { label: "Tied teams with counselor votes" }
      ),
      db.query(
        `SELECT team_id FROM camp201_logo_tiebreak_votes WHERE cohort_id = $1 AND voter_email = $2 LIMIT 1`,
        z.object({ team_id: z.coerce.number() }),
        [cohortId, email],
        { label: "My tie-breaker vote" }
      ),
      db.query(
        `SELECT
           (SELECT COUNT(*) FROM camp201_logo_tiebreak_votes WHERE cohort_id = $1)::int AS cast,
           (SELECT COUNT(DISTINCT lower(e)) FROM (
              SELECT email AS e FROM camp201_campers WHERE role IN ('counselor', 'admin') AND cohort_id = $1 AND removed_at IS NULL
              UNION SELECT email FROM camp201_admins) x)::int AS counselors`,
        z.object({ cast: z.coerce.number(), counselors: z.coerce.number() }),
        [cohortId],
        { label: "Tie-breaker progress" }
      ),
    ]);

    return {
      active: true,
      teams: teams.map(({ best_logo: _b, ...t }) => t),
      my_vote: mine[0]?.team_id ?? null,
      votes_cast: counts[0]?.cast ?? 0,
      counselors: counts[0]?.counselors ?? 0,
      winner_team_id: teams.find((t) => t.best_logo)?.id ?? null,
    };
  },
});

/** A counselor's one vote in the Best Logo tie-breaker. */
export const SubmitLogoTiebreakerVote = api({
  name: "SubmitLogoTiebreakerVote",
  description: "Counselor casts one Best Logo tie-breaker vote",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ team_id: z.number() }),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx, { team_id }) {
    const db = ctx.integrations.camp_201_db;
    const email = (ctx.user.email ?? "").toLowerCase();
    const access = await getCounselorAccess(db, email);
    if (!access.isAdmin || access.isGuestJudge) throw new Error("Only counselors can vote in the tie-breaker.");
    await assertNotViewingPast(db, email);
    const cohortId = await getActiveCohortId(db);
    if (cohortId === null) throw new Error("No active cohort.");

    const teamIds = await getTiebreakTeamIds(db, cohortId);
    if (teamIds.length < 2) return { success: false, message: "There's no tie to break." };
    if (!teamIds.includes(team_id)) throw new Error("Pick one of the tied teams.");

    const res = await db.query(
      `WITH ins AS (
         INSERT INTO camp201_logo_tiebreak_votes (cohort_id, team_id, voter_email, voter_name)
         VALUES ($1, $2, $3, $4) ON CONFLICT (cohort_id, voter_email) DO NOTHING RETURNING id
       ) SELECT COUNT(*)::int AS n FROM ins`,
      z.object({ n: z.coerce.number() }),
      [cohortId, team_id, email, ctx.user.name ?? null],
      { label: "Save tie-breaker vote" }
    );
    if (!res[0]?.n) return { success: false, message: "You've already voted in the tie-breaker." };

    await applyTiebreakWinner(db, cohortId);
    return { success: true, message: "Vote counted! Best Logo updates with each counselor vote." };
  },
});
