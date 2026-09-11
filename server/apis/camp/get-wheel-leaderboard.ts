import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const LeaderSchema = z.object({
  camper_id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  team_name: z.string().nullable(),
  team_color: z.string().nullable(),
  pitch_count: z.coerce.number(),
  avg_self_score: z.coerce.number(),
  avg_room_score: z.coerce.number(),
  total_points: z.coerce.number(),
});

export default api({
  name: "GetWheelLeaderboard",
  description: "Returns Wheel & Deal stats per pitcher for the leaderboard",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ leaders: z.array(LeaderSchema) }),
  async run(ctx) {
    const leaders = await ctx.integrations.apps_database.query(
      `SELECT
         r.pitcher_id as camper_id,
         c.first_name, c.last_name,
         t.name as team_name, t.color as team_color,
         COUNT(DISTINCT r.id) as pitch_count,
         COALESCE(ROUND(AVG(CASE WHEN s.is_self_eval = true THEN s.total ELSE NULL END)::numeric, 1), 0) as avg_self_score,
         COALESCE(ROUND(AVG(CASE WHEN r.room_avg_scores IS NOT NULL THEN (r.room_avg_scores->>'total')::numeric ELSE NULL END), 1), 0) as avg_room_score,
         COALESCE(SUM(DISTINCT r.points_awarded), 0) as total_points
       FROM camp201_wheel_rounds r
       JOIN camp201_campers c ON c.id = r.pitcher_id
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       LEFT JOIN camp201_wheel_scores s ON s.round_id = r.id AND s.scorer_id = r.pitcher_id
       WHERE r.status = 'closed'
       GROUP BY r.pitcher_id, c.first_name, c.last_name, t.name, t.color
       ORDER BY total_points DESC, pitch_count DESC
       LIMIT 50`,
      LeaderSchema,
      undefined,
      { label: "Get wheel leaderboard" }
    );
    return { leaders };
  },
});
