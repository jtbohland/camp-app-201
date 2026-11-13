import { api, z, postgres } from "@superblocksteam/sdk-api";
import { isCampClosed } from "../../lib/camp-closed-guard.js";
import { assertCanContribute, resolveHubViewer } from "../../lib/team-hub.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "DeleteHubItem",
  description: "Deletes a team hub post (author or counselor only)",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({ id: z.number() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { id }) {
    const db = ctx.integrations.camp_201_db;
    if (await isCampClosed(db)) throw new Error("cAMP is closed — the hub is read-only now.");

    const rows = await db.query(
      `SELECT team_id, author_id FROM camp201_hub_items WHERE id = $1 LIMIT 1`,
      z.object({ team_id: z.coerce.number(), author_id: z.coerce.number() }),
      [id],
      { label: "Load hub post" }
    );
    const item = rows[0];
    if (!item) return { success: true };

    const viewer = await resolveHubViewer(db, ctx.user.email, item.team_id);
    const me = assertCanContribute(viewer);
    if (item.author_id !== me && !viewer.isCounselor) {
      throw new Error("Only the author or a counselor can delete this post.");
    }

    // Points already earned for the post stay (same as other cAMP activity).
    await db.execute(`DELETE FROM camp201_hub_items WHERE id = $1`, [id], { label: "Delete hub post" });
    return { success: true };
  },
});
