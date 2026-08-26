import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetAdminCamperDetail",
  description: "Gets full detail for a single camper including points log and check-in history",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
  }),
  output: z.object({
    camper: z.object({
      id: z.coerce.number(),
      first_name: z.string(),
      last_name: z.string(),
      email: z.string(),
      role: z.string(),
      team_name: z.string().nullable(),
      points: z.coerce.number(),
      profile_completed: z.boolean(),
      bio: z.string().nullable(),
      fun_fact: z.string().nullable(),
      goal_1: z.string().nullable(),
      goal_2: z.string().nullable(),
      goal_3: z.string().nullable(),
      goal_1_achieved: z.boolean(),
      goal_2_achieved: z.boolean(),
      goal_3_achieved: z.boolean(),
      pin: z.string().nullable(),
      created_at: z.string(),
    }),
    points_log: z.array(z.object({
      points: z.coerce.number(),
      reason: z.string(),
      awarded_by: z.string(),
      created_at: z.string(),
    })),
    checkins: z.array(z.object({
      session_label: z.string(),
      timing: z.string(),
      points_awarded: z.coerce.number(),
      checked_in_at: z.string(),
    })),
  }),
  async run(ctx, { camper_id }) {
    const CamperDetailSchema = z.object({
      id: z.coerce.number(),
      first_name: z.string(),
      last_name: z.string(),
      email: z.string(),
      role: z.string(),
      team_name: z.string().nullable(),
      points: z.coerce.number(),
      profile_completed: z.boolean(),
      bio: z.string().nullable(),
      fun_fact: z.string().nullable(),
      goal_1: z.string().nullable(),
      goal_2: z.string().nullable(),
      goal_3: z.string().nullable(),
      goal_1_achieved: z.boolean(),
      goal_2_achieved: z.boolean(),
      goal_3_achieved: z.boolean(),
      pin: z.string().nullable(),
      created_at: z.string(),
    });

    const camperResult = await ctx.integrations.apps_database.query(
      `SELECT c.id, c.first_name, c.last_name, c.email, c.role,
              t.name as team_name, c.points, c.profile_completed,
              c.bio, c.fun_fact, c.goal_1, c.goal_2, c.goal_3,
              c.goal_1_achieved, c.goal_2_achieved, c.goal_3_achieved,
              c.pin, c.created_at
       FROM camp201_campers c
       LEFT JOIN camp201_teams t ON t.id = c.team_id
       WHERE c.id = $1 LIMIT 1`,
      CamperDetailSchema,
      [camper_id],
      { label: "Get camper detail" }
    );

    const PointsLogSchema = z.object({
      points: z.coerce.number(),
      reason: z.string(),
      awarded_by: z.string(),
      created_at: z.string(),
    });

    const pointsLog = await ctx.integrations.apps_database.query(
      `SELECT points, reason, awarded_by, created_at
       FROM camp201_points_log WHERE camper_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      PointsLogSchema,
      [camper_id],
      { label: "Get points log" }
    );

    const CheckinSchema = z.object({
      session_label: z.string(),
      timing: z.string(),
      points_awarded: z.coerce.number(),
      checked_in_at: z.string(),
    });

    const checkins = await ctx.integrations.apps_database.query(
      `SELECT s.label as session_label, r.timing, r.points_awarded, r.checked_in_at
       FROM camp201_checkin_responses r
       JOIN camp201_checkin_sessions s ON s.id = r.session_id
       WHERE r.camper_id = $1
       ORDER BY r.checked_in_at DESC LIMIT 20`,
      CheckinSchema,
      [camper_id],
      { label: "Get check-in history" }
    );

    return {
      camper: camperResult[0],
      points_log: pointsLog,
      checkins,
    };
  },
});
