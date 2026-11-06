import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireManager } from "../../lib/manager-threads.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "AddManagerComment",
  description: "Starts a manager note or reaction thread for a cAMPer",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number().int().positive(),
    comment_type: z.enum(["comment", "reaction"]),
    sentiment: z.enum(["positive", "encouraging", "feedback", "concerning"]),
    content: z.string().trim().min(1).max(2000),
    // 'camper' = the cAMPer sees it and can reply; 'counselor' = private to counselors
    visibility: z.enum(["camper", "counselor"]),
  }),
  output: z.object({ success: z.boolean(), comment_id: z.number() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    // Identity comes from the signed-in user, never from the browser
    const manager = await requireManager(db, ctx.user.email);

    const link = await db.query(
      `SELECT id FROM camp201_manager_hires WHERE manager_id = $1 AND camper_id = $2 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [manager.id, input.camper_id],
      { label: "Verify hire link" }
    );
    if (link.length === 0) throw new Error("This cAMPer is not linked to your account");

    const inserted = await db.query(
      `INSERT INTO camp201_manager_comments
         (manager_id, camper_id, comment_type, sentiment, content, visibility, manager_read_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [manager.id, input.camper_id, input.comment_type, input.sentiment, input.content, input.visibility],
      { label: "Insert manager thread" }
    );

    return { success: true, comment_id: inserted[0].id };
  },
});
