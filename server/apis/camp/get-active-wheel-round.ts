import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, getCounselorAccess, resolveViewCohort } from "../../lib/cohort.js";
import { expectedScorerSql, resolveWheelScorer } from "../../lib/wheel.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const RoundSchema = z.object({
  id: z.number(),
  pitcher_id: z.number(),
  pitcher_name: z.string(),
  product_id: z.string(),
  product_name: z.string(),
  challenge_type: z.string(),
  challenge_prompt: z.string(),
  completion_score: z.coerce.number(),
  pitch_time_seconds: z.coerce.number(),
  status: z.string(),
  pitcher_submitted: z.boolean(),
  vote_count: z.coerce.number(),
  expected_count: z.coerce.number(),
});

export default api({
  name: "GetActiveWheelRound",
  description: "Returns the open scoring round and who has scored it",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    round: RoundSchema.nullable(),
    already_scored: z.boolean(),
    is_pitcher: z.boolean(),
    /** Counselors only: eligible cAMPers who haven't voted yet. */
    waiting_on: z.array(z.string()),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const [view, access, scorer] = await Promise.all([
      resolveViewCohort(db, ctx.user.email),
      getCounselorAccess(db, ctx.user.email),
      resolveWheelScorer(db, ctx.user.email),
    ]);
    const VIEW = cohortIdSql(view.cohortId);

    const rounds = await db.query(
      `SELECT r.id, r.pitcher_id,
              TRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) AS pitcher_name,
              r.product_id, r.product_name, r.challenge_type, r.challenge_prompt,
              COALESCE(r.completion_score, 1) AS completion_score,
              COALESCE(r.pitch_time_seconds, 0) AS pitch_time_seconds, r.status,
              EXISTS(SELECT 1 FROM camp201_wheel_scores s WHERE s.round_id = r.id AND s.is_self_eval = TRUE) AS pitcher_submitted,
              (SELECT COUNT(*) FROM camp201_wheel_scores s WHERE s.round_id = r.id AND s.is_self_eval = FALSE) AS vote_count,
              (SELECT COUNT(*) FROM camp201_campers e WHERE ${expectedScorerSql("e", "r.pitcher_id")}) AS expected_count
         FROM camp201_wheel_rounds r
         JOIN camp201_campers p ON p.id = r.pitcher_id
        WHERE r.status = 'scoring' AND p.cohort_id = ${VIEW}
        ORDER BY r.created_at DESC
        LIMIT 1`,
      RoundSchema,
      undefined,
      { label: "Get open wheel round" }
    );
    const round = rounds[0] ?? null;
    if (!round) return { round: null, already_scored: false, is_pitcher: false, waiting_on: [] };

    const camperId = scorer?.camperId ?? 0;
    const [check] = await db.query(
      `SELECT EXISTS(SELECT 1 FROM camp201_wheel_scores WHERE round_id = $1 AND scorer_id = $2) AS done`,
      z.object({ done: z.boolean() }),
      [round.id, camperId],
      { label: "Check if I already scored" }
    );

    let waitingOn: string[] = [];
    if (access.isAdmin) {
      const pending = await db.query(
        `SELECT TRIM(COALESCE(e.first_name, '') || ' ' || COALESCE(e.last_name, '')) AS name
           FROM camp201_campers e
          WHERE ${expectedScorerSql("e", "$1::int")}
            AND NOT EXISTS (SELECT 1 FROM camp201_wheel_scores s WHERE s.round_id = $2 AND s.scorer_id = e.id)
          ORDER BY e.first_name, e.last_name
          LIMIT 60`,
        z.object({ name: z.string() }),
        [round.pitcher_id, round.id],
        { label: "Who still needs to vote" }
      );
      waitingOn = pending.map((p) => p.name);
    }

    return {
      round,
      already_scored: check.done,
      is_pitcher: camperId > 0 && round.pitcher_id === camperId,
      waiting_on: waitingOn,
    };
  },
});
