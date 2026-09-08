import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "AddManagerComment",
  description: "Adds a comment or reaction from a manager about a cAMPer",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    manager_email: z.string(),
    camper_id: z.number(),
    comment_type: z.string(), // 'comment' or 'reaction'
    sentiment: z.string(), // 'positive', 'feedback', 'encouraging', 'concerning'
    content: z.string(),
  }),
  output: z.object({ success: z.boolean(), comment_id: z.number() }),
  async run(ctx, input) {
    // Get manager ID
    const managers = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_managers WHERE email = $1 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [input.manager_email],
      { label: "Find manager" }
    );

    if (managers.length === 0) {
      throw new Error("Manager not found");
    }

    // Verify this camper is linked to this manager
    const link = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_manager_hires WHERE manager_id = $1 AND camper_id = $2 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [managers[0].id, input.camper_id],
      { label: "Verify hire link" }
    );

    if (link.length === 0) {
      throw new Error("This cAMPer is not linked to your account");
    }

    const inserted = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_manager_comments (manager_id, camper_id, comment_type, sentiment, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [managers[0].id, input.camper_id, input.comment_type, input.sentiment, input.content],
      { label: "Insert manager comment" }
    );

    return { success: true, comment_id: inserted[0].id };
  },
});
