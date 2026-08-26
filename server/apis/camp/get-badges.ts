import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const BadgeSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  color: z.string(),
  category: z.string(),
  requirement_type: z.string(),
  requirement_value: z.coerce.number(),
  points_reward: z.coerce.number(),
});

const EarnedBadgeSchema = z.object({
  badge_id: z.coerce.number(),
  badge_name: z.string(),
  badge_icon: z.string(),
  badge_color: z.string(),
  badge_description: z.string(),
  awarded_at: z.string(),
  awarded_by_name: z.string().nullable(),
});

export default api({
  name: "GetBadges",
  description: "Gets all badges and which ones a camper has earned",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number().nullable(),
  }),
  output: z.object({
    all_badges: z.array(BadgeSchema),
    earned_badges: z.array(EarnedBadgeSchema),
  }),
  async run(ctx, { camper_id }) {
    const allBadges = await ctx.integrations.apps_database.query(
      `SELECT id, name, description, icon, color, category, requirement_type, requirement_value, points_reward
       FROM camp201_badges ORDER BY category, name LIMIT 50`,
      BadgeSchema,
      undefined,
      { label: "Get all badges" }
    );

    let earnedBadges: z.infer<typeof EarnedBadgeSchema>[] = [];
    if (camper_id) {
      earnedBadges = await ctx.integrations.apps_database.query(
        `SELECT cb.badge_id, b.name as badge_name, b.icon as badge_icon, b.color as badge_color,
                b.description as badge_description, cb.awarded_at,
                CONCAT(c.first_name, ' ', c.last_name) as awarded_by_name
         FROM camp201_camper_badges cb
         JOIN camp201_badges b ON b.id = cb.badge_id
         LEFT JOIN camp201_campers c ON c.id = cb.awarded_by
         WHERE cb.camper_id = $1
         ORDER BY cb.awarded_at DESC LIMIT 50`,
        EarnedBadgeSchema,
        [camper_id],
        { label: "Get earned badges" }
      );
    }

    return { all_badges: allBadges, earned_badges: earnedBadges };
  },
});
