import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, resolveViewCohort } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const LeaderSchema = z.object({
  camper_id: z.number(),
  first_name: z.string(),
  last_name: z.string(),
  team_name: z.string().nullable(),
  team_color: z.string().nullable(),
  team_logo: z.string().nullable(),
  pitch_count: z.coerce.number(),
  avg_self_score: z.coerce.number(),
  avg_room_score: z.coerce.number(),
  /** Average gap between their self-eval and the room average (smaller = better). Null with no self-eval. */
  avg_delta: z.coerce.number().nullable(),
  spot_on_count: z.coerce.number(),
  total_points: z.coerce.number(),
});

/**
 * Ranking: smallest average self-vs-room gap first, then most points, then most pitches.
 * Pitchers with no comparable self-eval go last. Shared with Close cAMP (Wheel Dealer badge).
 */
export const WHEEL_RANK_ORDER_SQL = `avg_delta ASC NULLS LAST, total_points DESC, pitch_count DESC`;

/** Per-pitcher Wheel & Deal stats for one cohort. `cohortSql` must be a constant or cohortIdSql() value. */
export function wheelLeadersSql(cohortSql: string, limit: number): string {
  return `
    SELECT r.pitcher_id AS camper_id,
           c.first_name, c.last_name,
           t.name AS team_name, t.color AS team_color, NULLIF(t.logo_url, '') AS team_logo,
           COUNT(*) AS pitch_count,
           COALESCE(ROUND(AVG((r.self_scores->>'total')::numeric), 1), 0) AS avg_self_score,
           COALESCE(ROUND(AVG(CASE WHEN COALESCE(r.room_vote_count, 0) > 0 THEN (r.room_avg_scores->>'total')::numeric END), 1), 0) AS avg_room_score,
           ROUND(AVG(CASE WHEN COALESCE(r.room_vote_count, 0) > 0 AND r.self_scores ? 'total'
                          THEN abs((r.self_scores->>'total')::numeric - (r.room_avg_scores->>'total')::numeric) END), 1) AS avg_delta,
           COUNT(*) FILTER (WHERE COALESCE(r.spot_on_bonus, 0) > 0) AS spot_on_count,
           COALESCE(SUM(r.points_awarded), 0) AS total_points
      FROM camp201_wheel_rounds r
      JOIN camp201_campers c ON c.id = r.pitcher_id
      LEFT JOIN camp201_teams t ON t.id = c.team_id
     WHERE r.status = 'closed' AND c.cohort_id = ${cohortSql}
     GROUP BY r.pitcher_id, c.first_name, c.last_name, t.name, t.color, t.logo_url
     ORDER BY ${WHEEL_RANK_ORDER_SQL}
     LIMIT ${Math.max(1, Math.floor(limit))}`;
}

export default api({
  name: "GetWheelLeaderboard",
  description: "Wheel & Deal leaderboard ranked by self vs room gap",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ leaders: z.array(LeaderSchema) }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const view = await resolveViewCohort(db, ctx.user.email);
    const leaders = await db.query(wheelLeadersSql(cohortIdSql(view.cohortId), 50), LeaderSchema, undefined, {
      label: "Get wheel leaderboard",
    });
    return { leaders };
  },
});
