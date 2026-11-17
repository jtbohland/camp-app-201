import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, requireCounselor } from "../../lib/cohort.js";
import { toScoreMap } from "../../lib/wheel.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const ScoreMap = z.record(z.string(), z.number());

export default api({
  name: "CloseWheelScoring",
  description: "Counselor closes a round; averages votes and awards pitch points once",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    round_id: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
    already_closed: z.boolean(),
    had_self_eval: z.boolean(),
    self_total: z.number(),
    self_scores: ScoreMap,
    room_avg: ScoreMap,
    room_avg_total: z.number(),
    room_vote_count: z.number(),
    completion_score: z.number(),
    points_awarded: z.number(),
  }),
  async run(ctx, { round_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);

    // Averages, points and the award all happen in one locked step, so a double click,
    // two counselors, or a retry can never award a round twice.
    const [closed] = await db.query(
      `SELECT camp201_close_wheel_round($1, 0) AS points`,
      z.object({ points: z.coerce.number().nullable() }),
      [round_id],
      { label: "Close round and award points" }
    );

    const rows = await db.query(
      `SELECT status, self_scores, room_avg_scores, COALESCE(room_vote_count, 0) AS room_vote_count,
              COALESCE(points_awarded, 0) AS points_awarded, COALESCE(completion_score, 0) AS completion_score
         FROM camp201_wheel_rounds WHERE id = $1 LIMIT 1`,
      z.object({
        status: z.string(),
        self_scores: z.unknown(),
        room_avg_scores: z.unknown(),
        room_vote_count: z.coerce.number(),
        points_awarded: z.coerce.number(),
        completion_score: z.coerce.number(),
      }),
      [round_id],
      { label: "Read round results" }
    );
    const round = rows[0];
    if (!round || round.status === "cancelled") throw new Error("This round was cancelled.");

    const self = toScoreMap(round.self_scores);
    const room = toScoreMap(round.room_avg_scores);
    return {
      success: true,
      already_closed: closed?.points === null,
      had_self_eval: Object.keys(self).length > 0,
      self_total: self.total ?? 0,
      self_scores: self,
      room_avg: room,
      room_avg_total: room.total ?? 0,
      room_vote_count: round.room_vote_count,
      completion_score: round.completion_score,
      points_awarded: round.points_awarded,
    };
  },
});
