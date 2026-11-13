import { api, z, postgres } from "@superblocksteam/sdk-api";
import { isCampClosed } from "../../lib/camp-closed-guard.js";
import { assertAssigneeOnTeam, assertCanContribute, cleanLink, resolveHubViewer } from "../../lib/team-hub.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const ItemRow = z.object({
  team_id: z.coerce.number(),
  author_id: z.coerce.number(),
  item_type: z.string(),
});

/**
 * Edits a hub post. Any field left null is unchanged.
 * - Title, text, and link: the author or a counselor.
 * - Pin, done, and assignee: anyone on the team (shared to-do list), or a counselor.
 */
export default api({
  name: "UpdateHubItem",
  description: "Edits, pins, completes, or reassigns a team hub post",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
    title: z.string().trim().min(1).max(200).nullable(),
    content: z.string().max(5000).nullable(),
    link_url: z.string().max(2000).nullable(),
    is_pinned: z.boolean().nullable(),
    is_done: z.boolean().nullable(),
    /** Set `clear_assignee` to unassign; a null assignee_id alone leaves it unchanged. */
    assignee_id: z.number().nullable(),
    clear_assignee: z.boolean().nullable(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    if (await isCampClosed(db)) throw new Error("cAMP is closed — the hub is read-only now.");

    const rows = await db.query(
      `SELECT team_id, author_id, item_type FROM camp201_hub_items WHERE id = $1 LIMIT 1`,
      ItemRow,
      [input.id],
      { label: "Load hub post" }
    );
    const item = rows[0];
    if (!item) throw new Error("That post no longer exists.");

    const viewer = await resolveHubViewer(db, ctx.user.email, item.team_id);
    const me = assertCanContribute(viewer);

    const editsContent = input.title !== null || input.content !== null || input.link_url !== null;
    if (editsContent && item.author_id !== me && !viewer.isCounselor) {
      throw new Error("Only the author or a counselor can edit this post.");
    }

    const settingAssignee = input.assignee_id !== null;
    if (settingAssignee && item.item_type !== "task") throw new Error("Only to-dos can be assigned.");
    if (settingAssignee) await assertAssigneeOnTeam(db, input.assignee_id, item.team_id);

    await db.execute(
      `UPDATE camp201_hub_items SET
         title       = COALESCE($2, title),
         content     = COALESCE($3, content),
         link_url    = CASE WHEN $4::boolean THEN $5 ELSE link_url END,
         is_pinned   = COALESCE($6, is_pinned),
         is_done     = COALESCE($7, is_done),
         assignee_id = CASE WHEN $8::boolean THEN NULL WHEN $9::int IS NOT NULL THEN $9 ELSE assignee_id END,
         updated_at  = NOW()
       WHERE id = $1`,
      [
        input.id,
        input.title,
        input.content === null ? null : input.content.trim(),
        input.link_url !== null,
        input.link_url === null ? null : cleanLink(input.link_url),
        input.is_pinned,
        input.is_done,
        input.clear_assignee === true,
        input.assignee_id,
      ],
      { label: "Update hub post" }
    );

    return { success: true };
  },
});
