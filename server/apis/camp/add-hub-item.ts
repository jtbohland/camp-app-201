import { api, z, postgres } from "@superblocksteam/sdk-api";
import { awardRepeatableBadge } from "../../lib/award-badge.js";
import { BADGE_IDS } from "../../lib/accelerator.js";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

// Item types that earn silent XP (notes & ideas — not resources/links/documents)
const XP_ELIGIBLE_TYPES = new Set(["note", "idea"]);
const HUB_XP_DAILY_CAP = 2;
// Minimum combined character length (title + content) to qualify for XP.
const MIN_CHARS_FOR_XP = 30;

export default api({
  name: "AddHubItem",
  description: "Adds a note, resource, or idea to a team hub section with silent XP for contributions",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    team_id: z.number(),
    author_id: z.number(),
    section: z.string(),
    item_type: z.string(),
    title: z.string(),
    content: z.string().nullable(),
  }),
  output: z.object({
    id: z.coerce.number(),
    success: z.boolean(),
    xp_awarded: z.number(),
  }),
  async run(ctx, { team_id, author_id, section, item_type, title, content }) {
    // Insert the hub item
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_hub_items (team_id, author_id, section, item_type, title, content)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [team_id, author_id, section, item_type, title, content ?? ""],
      { label: "Add hub item" }
    );

    let xpAwarded = 0;

    // Award silent XP for notes & ideas (not resources/links/documents)
    // Must meet minimum character threshold to prevent gaming
    const combinedLength = (title.trim().length) + ((content ?? "").trim().length);
    if (XP_ELIGIBLE_TYPES.has(item_type) && combinedLength >= MIN_CHARS_FOR_XP) {
      // Check daily cap: count hub_contribution points for this camper today
      const todayCount = await ctx.integrations.apps_database.query(
        `SELECT COUNT(*)::int AS cnt
         FROM camp201_points_log
         WHERE camper_id = $1
           AND category = 'hub_contribution'
           AND created_at >= CURRENT_DATE`,
        z.object({ cnt: z.coerce.number() }),
        [author_id],
        { label: "Check daily hub XP cap" }
      );

      if (todayCount[0].cnt < HUB_XP_DAILY_CAP) {
        const badgeResult = await awardRepeatableBadge(
          ctx.integrations.apps_database,
          author_id,
          BADGE_IDS.HUB_POST,
          `Hub ${item_type}: ${title.slice(0, 50)}`,
        );
        xpAwarded = badgeResult.points;
      }
    }

    return { id: result[0].id, success: true, xp_awarded: xpAwarded };
  },
});
