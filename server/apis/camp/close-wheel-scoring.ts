import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const AvgSchema = z.object({
  avg_clarity: z.coerce.number(),
  avg_tone: z.coerce.number(),
  avg_credibility: z.coerce.number(),
  avg_close: z.coerce.number(),
  avg_completion: z.coerce.number(),
  avg_total: z.coerce.number(),
  vote_count: z.coerce.number(),
});

export default api({
  name: "CloseWheelScoring",
  description: "Counselor closes scoring, calculates room averages, awards points",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    round_id: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
    self_total: z.number(),
    room_avg_total: z.number(),
    room_vote_count: z.number(),
    points_awarded: z.number(),
  }),
  async run(ctx, { round_id }) {
    // 1. Get self-eval scores
    const SelfSchema = z.object({ total: z.number(), pitcher_id: z.number() });
    const selfRows = await ctx.integrations.apps_database.query(
      `SELECT s.total, r.pitcher_id
       FROM camp201_wheel_scores s
       JOIN camp201_wheel_rounds r ON r.id = s.round_id
       WHERE s.round_id = $1 AND s.is_self_eval = TRUE
       LIMIT 1`,
      SelfSchema,
      [round_id],
      { label: "Get self-eval for round" }
    );
    const selfTotal = selfRows.length > 0 ? selfRows[0].total : 0;
    const pitcherId = selfRows.length > 0 ? selfRows[0].pitcher_id : 0;

    // 2. Calculate room averages (non-self-eval only, fully submitted scores)
    const avgRows = await ctx.integrations.apps_database.query(
      `SELECT
        ROUND(AVG(clarity)::numeric, 1) as avg_clarity,
        ROUND(AVG(tone)::numeric, 1) as avg_tone,
        ROUND(AVG(credibility)::numeric, 1) as avg_credibility,
        ROUND(AVG(close_score)::numeric, 1) as avg_close,
        ROUND(AVG(completion)::numeric, 1) as avg_completion,
        ROUND(AVG(total)::numeric, 1) as avg_total,
        COUNT(*) as vote_count
       FROM camp201_wheel_scores
       WHERE round_id = $1 AND is_self_eval = FALSE`,
      AvgSchema,
      [round_id],
      { label: "Calculate room averages" }
    );
    const avg = avgRows[0];

    // 3. Calculate points
    // Base: +5 for pitching (courage!)
    let points = 5;

    // Self-awareness bonus: how close self-eval is to room average
    if (avg.vote_count > 0) {
      const diff = Math.abs(selfTotal - avg.avg_total);
      if (diff <= 1) points += 3;       // Within 1 point = very self-aware
      else if (diff <= 2) points += 2;   // Within 2 points
      else points += 1;                  // 3+ off, still get something

      // Room performance bonus: if room avg >= 12/15
      if (avg.avg_total >= 12) points += 2;
    }

    // 4. Update the round with results
    const roomAvgScores = {
      clarity: avg.avg_clarity,
      tone: avg.avg_tone,
      credibility: avg.avg_credibility,
      close: avg.avg_close,
      completion: avg.avg_completion,
      total: avg.avg_total,
    };

    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_wheel_rounds
       SET status = 'closed',
           self_scores = (SELECT row_to_json(s) FROM (SELECT clarity, tone, credibility, close_score, completion, total FROM camp201_wheel_scores WHERE round_id = $1 AND is_self_eval = TRUE LIMIT 1) s),
           room_avg_scores = $2::jsonb,
           room_vote_count = $3,
           points_awarded = $4,
           closed_at = NOW()
       WHERE id = $1`,
      [round_id, JSON.stringify(roomAvgScores), avg.vote_count, points],
      { label: "Close wheel round" }
    );

    // 5. Award points to the pitcher
    if (pitcherId > 0) {
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
        [points, pitcherId],
        { label: "Award wheel points to pitcher" }
      );
    }

    return {
      success: true,
      self_total: selfTotal,
      room_avg_total: Math.round(avg.avg_total * 10) / 10,
      room_vote_count: avg.vote_count,
      points_awarded: points,
    };
  },
});
