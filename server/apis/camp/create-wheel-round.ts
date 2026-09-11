import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "CreateWheelRound",
  description: "Creates a new wheel round when the timer stops after a pitch",
  integrations: { apps_database: postgres(APPS_DB) },
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
    const RoundIdSchema = z.object({ id: z.number() });
    const rows = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_wheel_rounds
        (pitcher_id, product_id, product_name, challenge_type, challenge_prompt, completion_score, pitch_time_seconds, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'scoring')
       RETURNING id`,
      RoundIdSchema,
      [input.pitcher_id, input.product_id, input.product_name, input.challenge_type, input.challenge_prompt, input.completion_score, input.pitch_time_seconds],
      { label: "Create wheel round" }
    );
    return { round_id: rows[0].id };
  },
});
