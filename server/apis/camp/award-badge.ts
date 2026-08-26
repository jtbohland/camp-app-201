import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "AwardBadge",
  description: "Awards a badge to a camper and grants bonus points",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    badge_id: z.number(),
    awarded_by: z.number(),
  }),
  output: z.object({ success: z.boolean(), already_earned: z.boolean(), points_awarded: z.number() }),
  async run(ctx, { camper_id, badge_id, awarded_by }) {
    // Check if already earned
    const CountSchema = z.object({ count: z.coerce.number() });
    const existing = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_camper_badges WHERE camper_id = $1 AND badge_id = $2`,
      CountSchema,
      [camper_id, badge_id],
      { label: "Check if badge already earned" }
    );
    if (existing[0].count > 0) {
      return { success: false, already_earned: true, points_awarded: 0 };
    }

    // Get badge points
    const BadgeSchema = z.object({ points_reward: z.coerce.number(), name: z.string() });
    const badge = await ctx.integrations.apps_database.query(
      `SELECT points_reward, name FROM camp201_badges WHERE id = $1 LIMIT 1`,
      BadgeSchema,
      [badge_id],
      { label: "Get badge info" }
    );
    if (badge.length === 0) {
      return { success: false, already_earned: false, points_awarded: 0 };
    }

    const { points_reward, name } = badge[0];

    // Award the badge
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_camper_badges (camper_id, badge_id, awarded_by) VALUES ($1, $2, $3)`,
      [camper_id, badge_id, awarded_by],
      { label: "Award badge" }
    );

    // Grant bonus points
    if (points_reward > 0) {
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
        [points_reward, camper_id],
        { label: "Award badge points" }
      );
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
         VALUES ($1, $2, $3, 'system')`,
        [camper_id, points_reward, `Badge earned: ${name}`],
        { label: "Log badge points" }
      );
    }

    return { success: true, already_earned: false, points_awarded: points_reward };
  },
});
