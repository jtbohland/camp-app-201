import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "DeleteMemory",
  description: "Counselor deletes a post from the Memories feed",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    /** Feed id: positive = memory, negative = legacy gallery photo. */
    memory_id: z.number().int(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { memory_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    if (memory_id === 0) throw new Error("Post not found.");

    const isGallery = memory_id < 0;
    const table = isGallery ? "camp201_gallery" : "camp201_memories";
    const rowId = Math.abs(memory_id);

    const found = await db.query(
      `SELECT id FROM ${table} WHERE id = $1 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [rowId],
      { label: "Find post" }
    );
    if (!found[0]) throw new Error("Post not found. It may already be deleted.");

    await db.execute(
      `DELETE FROM camp201_memory_reactions WHERE memory_id = $1`,
      [memory_id],
      { label: "Delete post reactions" }
    );
    await db.execute(`DELETE FROM ${table} WHERE id = $1`, [rowId], { label: "Delete post" });
    return { success: true };
  },
});
