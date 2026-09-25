import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "ToggleReaction",
  description: "Toggles an emoji reaction on a memory (add if not exists, remove if exists)",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    memory_id: z.number(),
    camper_id: z.number(),
    emoji: z.string(),
  }),
  output: z.object({ success: z.boolean(), action: z.string() }),
  async run(ctx, { memory_id, camper_id, emoji }) {
    // Check if reaction exists
    const existing = await ctx.integrations.camp_201_db.query(
      `SELECT id FROM camp201_memory_reactions WHERE memory_id = $1 AND camper_id = $2 AND emoji = $3 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [memory_id, camper_id, emoji],
      { label: "Check existing reaction" }
    );

    if (existing.length > 0) {
      // Remove reaction
      await ctx.integrations.camp_201_db.execute(
        `DELETE FROM camp201_memory_reactions WHERE memory_id = $1 AND camper_id = $2 AND emoji = $3`,
        [memory_id, camper_id, emoji],
        { label: "Remove reaction" }
      );
      return { success: true, action: "removed" };
    } else {
      // Add reaction
      await ctx.integrations.camp_201_db.execute(
        `INSERT INTO camp201_memory_reactions (memory_id, camper_id, emoji)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [memory_id, camper_id, emoji],
        { label: "Add reaction" }
      );
      return { success: true, action: "added" };
    }
  },
});
