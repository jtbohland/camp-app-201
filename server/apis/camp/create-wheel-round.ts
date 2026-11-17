import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "CreateWheelRound",
  description: "Opens scoring for a pitch; wraps up any round left open",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    pitcher_id: z.number(),
    product_id: z.string(),
    product_name: z.string(),
    challenge_type: z.string(),
    challenge_prompt: z.string(),
    completion_score: z.number(),
    pitch_time_seconds: z.number(),
  }),
  output: z.object({ round_id: z.number() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);

    // A round left open (closed tab, refresh) is wrapped up first so its pitcher still
    // gets their points: rounds with any scores are closed, empty ones are cancelled.
    await db.execute(
      `UPDATE camp201_wheel_rounds w SET status = 'cancelled', closed_at = NOW()
        WHERE w.status = 'scoring'
          AND w.pitcher_id IN (SELECT id FROM camp201_campers
                                WHERE cohort_id = (SELECT cohort_id FROM camp201_campers WHERE id = $1))
          AND NOT EXISTS (SELECT 1 FROM camp201_wheel_scores s WHERE s.round_id = w.id)`,
      [input.pitcher_id],
      { label: "Cancel empty open rounds" }
    );
    await db.query(
      `SELECT camp201_close_wheel_round(w.id, 0) AS points
         FROM camp201_wheel_rounds w
        WHERE w.status = 'scoring'
          AND w.pitcher_id IN (SELECT id FROM camp201_campers
                                WHERE cohort_id = (SELECT cohort_id FROM camp201_campers WHERE id = $1))
        ORDER BY w.id`,
      z.object({ points: z.coerce.number().nullable() }),
      [input.pitcher_id],
      { label: "Close rounds left open" }
    );

    const completion = Math.min(3, Math.max(1, Math.round(input.completion_score)));
    const rows = await db.query(
      `INSERT INTO camp201_wheel_rounds
        (pitcher_id, product_id, product_name, challenge_type, challenge_prompt, completion_score, pitch_time_seconds, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scoring')
       RETURNING id`,
      z.object({ id: z.number() }),
      [input.pitcher_id, input.product_id, input.product_name, input.challenge_type, input.challenge_prompt, completion, Math.max(0, Math.round(input.pitch_time_seconds))],
      { label: "Create wheel round" }
    );
    return { round_id: rows[0].id };
  },
});
