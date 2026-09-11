import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SubmitWheelScore",
  description: "Camper submits their score for a wheel round (self-eval or room vote)",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    round_id: z.number(),
    scorer_id: z.number(),
    is_self_eval: z.boolean(),
    clarity: z.number().min(1).max(3),
    tone: z.number().min(1).max(3),
    credibility: z.number().min(1).max(3),
    close_score: z.number().min(1).max(3),
    completion: z.number().min(1).max(3),
  }),
  output: z.object({ success: z.boolean(), total: z.number() }),
  async run(ctx, input) {
    const total = input.clarity + input.tone + input.credibility + input.close_score + input.completion;

    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_wheel_scores
        (round_id, scorer_id, is_self_eval, clarity, tone, credibility, close_score, completion, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (round_id, scorer_id) DO UPDATE SET
        clarity = EXCLUDED.clarity, tone = EXCLUDED.tone,
        credibility = EXCLUDED.credibility, close_score = EXCLUDED.close_score,
        completion = EXCLUDED.completion, total = EXCLUDED.total,
        submitted_at = NOW()`,
      [input.round_id, input.scorer_id, input.is_self_eval, input.clarity, input.tone, input.credibility, input.close_score, input.completion, total],
      { label: "Submit wheel score" }
    );

    return { success: true, total };
  },
});
