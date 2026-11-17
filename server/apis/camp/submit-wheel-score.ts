import { api, z, postgres } from "@superblocksteam/sdk-api";
import { resolveWheelScorer } from "../../lib/wheel.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const Score = z.number().int().min(1).max(3);

export default api({
  name: "SubmitWheelScore",
  description: "Saves a pitcher self-eval or room vote for an open round",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    round_id: z.number(),
    clarity: Score,
    tone: Score,
    credibility: Score,
    close_score: Score,
  }),
  output: z.object({ success: z.boolean(), total: z.number(), is_self_eval: z.boolean() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;

    // Who is scoring comes from the sign-in, never from the browser.
    const scorer = await resolveWheelScorer(db, ctx.user.email);
    if (!scorer) throw new Error("You need a cAMP profile to score pitches.");
    if (scorer.isCounselor) throw new Error("Counselors don't score Wheel & Deal pitches.");

    const rounds = await db.query(
      `SELECT r.pitcher_id, r.status, r.completion_score, c.cohort_id
         FROM camp201_wheel_rounds r
         JOIN camp201_campers c ON c.id = r.pitcher_id
        WHERE r.id = $1
        LIMIT 1`,
      z.object({
        pitcher_id: z.coerce.number(),
        status: z.string(),
        completion_score: z.coerce.number().nullable(),
        cohort_id: z.coerce.number().nullable(),
      }),
      [input.round_id],
      { label: "Load wheel round" }
    );
    const round = rounds[0];
    if (!round) throw new Error("That pitch round no longer exists.");
    if (round.status !== "scoring") throw new Error("Scoring for this pitch is already closed.");
    if (round.cohort_id !== scorer.cohortId) throw new Error("This pitch belongs to another cohort.");

    const isSelf = round.pitcher_id === scorer.camperId;
    // Completion comes from the timer, saved on the round.
    const completion = Math.min(3, Math.max(1, Math.round(round.completion_score ?? 1)));
    const total = input.clarity + input.tone + input.credibility + input.close_score + completion;

    // RETURNING (not rowCount) tells us whether the row was saved: rowCount is unreliable
    // for INSERT ... ON CONFLICT on this database.
    const saved = await db.query(
      `WITH up AS (
         INSERT INTO camp201_wheel_scores
           (round_id, scorer_id, is_self_eval, clarity, tone, credibility, close_score, completion, total)
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9
          WHERE EXISTS (SELECT 1 FROM camp201_wheel_rounds WHERE id = $1 AND status = 'scoring')
         ON CONFLICT (round_id, scorer_id) DO UPDATE SET
           is_self_eval = EXCLUDED.is_self_eval,
           clarity = EXCLUDED.clarity, tone = EXCLUDED.tone,
           credibility = EXCLUDED.credibility, close_score = EXCLUDED.close_score,
           completion = EXCLUDED.completion, total = EXCLUDED.total,
           submitted_at = NOW()
         RETURNING id
       )
       SELECT id FROM up LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [input.round_id, scorer.camperId, isSelf, input.clarity, input.tone, input.credibility, input.close_score, completion, total],
      { label: isSelf ? "Save pitcher self-eval" : "Save room vote" }
    );
    if (saved.length === 0) throw new Error("Scoring for this pitch just closed.");

    return { success: true, total, is_self_eval: isSelf };
  },
});
