import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const RoundSchema = z.object({
  id: z.number(),
  pitcher_id: z.number(),
  product_id: z.string(),
  product_name: z.string(),
  challenge_type: z.string(),
  challenge_prompt: z.string(),
  completion_score: z.number(),
  pitch_time_seconds: z.number(),
  status: z.string(),
  pitcher_submitted: z.boolean(),
  vote_count: z.coerce.number(),
});

export default api({
  name: "GetActiveWheelRound",
  description: "Returns the current active scoring round, if any",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    camper_id: z.number(),
  }),
  output: z.object({
    round: RoundSchema.nullable(),
    already_scored: z.boolean(),
  }),
  async run(ctx, { camper_id }) {
    // Get the most recent round that is still in 'scoring' status
    const rounds = await ctx.integrations.apps_database.query(
      `SELECT r.id, r.pitcher_id, r.product_id, r.product_name,
              r.challenge_type, r.challenge_prompt, r.completion_score,
              r.pitch_time_seconds, r.status,
              EXISTS(SELECT 1 FROM camp201_wheel_scores s WHERE s.round_id = r.id AND s.is_self_eval = TRUE) as pitcher_submitted,
              (SELECT COUNT(*) FROM camp201_wheel_scores s WHERE s.round_id = r.id AND s.is_self_eval = FALSE) as vote_count
       FROM camp201_wheel_rounds r
       WHERE r.status = 'scoring'
       ORDER BY r.created_at DESC
       LIMIT 1`,
      RoundSchema,
      undefined,
      { label: "Get active wheel round" }
    );

    if (rounds.length === 0) return { round: null, already_scored: false };

    const round = rounds[0];

    // Check if this camper already scored this round
    const ExistsSchema = z.object({ exists: z.boolean() });
    const [check] = await ctx.integrations.apps_database.query(
      `SELECT EXISTS(SELECT 1 FROM camp201_wheel_scores WHERE round_id = $1 AND scorer_id = $2) as exists`,
      ExistsSchema,
      [round.id, camper_id],
      { label: "Check if camper already scored" }
    );

    return { round, already_scored: check.exists };
  },
});
