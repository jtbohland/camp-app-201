import { api, z, postgres } from "@superblocksteam/sdk-api";
import { awardRepeatableBadge } from "../../lib/award-badge.js";
import { BADGE_IDS } from "../../lib/accelerator.js";
import { isCampClosed } from "../../lib/camp-closed-guard.js";
import {
  HUB_ITEM_TYPES, assertAssigneeOnTeam, assertCanContribute, assertPresentationUnlocked, cleanLink, isValidSection, resolveHubViewer,
} from "../../lib/team-hub.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

// Notes & ideas earn XP (not links, docs, or to-dos), up to 2 a day, with enough substance.
const XP_ELIGIBLE_TYPES = new Set(["note", "idea"]);
const HUB_XP_DAILY_CAP = 2;
const MIN_CHARS_FOR_XP = 30;

export default api({
  name: "AddHubItem",
  description: "Adds a post or to-do to a team hub as the signed-in member, with capped XP",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    team_id: z.number(),
    section: z.string(),
    item_type: z.enum(HUB_ITEM_TYPES),
    title: z.string().trim().min(1, "Title is required").max(200),
    content: z.string().max(5000).nullable(),
    link_url: z.string().max(2000).nullable(),
    assignee_id: z.number().nullable(),
  }),
  output: z.object({
    id: z.coerce.number(),
    success: z.boolean(),
    xp_awarded: z.number(),
  }),
  async run(ctx, { team_id, section, item_type, title, content, link_url, assignee_id }) {
    const db = ctx.integrations.camp_201_db;
    if (await isCampClosed(db)) throw new Error("cAMP is closed — no more hub posts accepted.");
    if (!isValidSection(section)) throw new Error("Unknown hub section.");

    const viewer = await resolveHubViewer(db, ctx.user.email, team_id);
    const authorId = assertCanContribute(viewer);
    await assertPresentationUnlocked(db, { section }, viewer.isCounselor);
    const link = cleanLink(link_url);
    const assignee = item_type === "task" ? assignee_id : null;
    await assertAssigneeOnTeam(db, assignee, team_id);

    const result = await db.query(
      `INSERT INTO camp201_hub_items (team_id, author_id, section, item_type, title, content, link_url, assignee_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [team_id, authorId, section, item_type, title, (content ?? "").trim(), link, assignee],
      { label: "Add hub post" }
    );

    let xpAwarded = 0;
    const combinedLength = title.trim().length + (content ?? "").trim().length;
    if (XP_ELIGIBLE_TYPES.has(item_type) && combinedLength >= MIN_CHARS_FOR_XP && !viewer.isCounselor) {
      // The badge helper logs these as "Hub note: …" / "Hub idea: …" with no category, so match on reason.
      const today = await db.query(
        `SELECT COUNT(*)::int AS cnt FROM camp201_points_log
         WHERE camper_id = $1 AND (reason LIKE 'Hub note:%' OR reason LIKE 'Hub idea:%')
           AND created_at >= CURRENT_DATE`,
        z.object({ cnt: z.coerce.number() }),
        [authorId],
        { label: "Check daily hub XP cap" }
      );
      if ((today[0]?.cnt ?? 0) < HUB_XP_DAILY_CAP) {
        const badge = await awardRepeatableBadge(db, authorId, BADGE_IDS.HUB_POST, `Hub ${item_type}: ${title.slice(0, 50)}`);
        xpAwarded = badge.points;
      }
    }

    return { id: result[0].id, success: true, xp_awarded: xpAwarded };
  },
});
