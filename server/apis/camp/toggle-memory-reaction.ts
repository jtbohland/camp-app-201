import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "ToggleMemoryReaction",
  description: "Toggles an emoji reaction on a memory post (add/remove)",
  integrations: { apps_database: postgres(APPS_DB) },
  input: z.object({
    memory_id: z.number(),
    camper_id: z.number(),
    emoji: z.string(),
  }),
  output: z.object({
    success: z.boolean(),
    action: z.enum(["added", "removed"]),
  }),
  async run(ctx, { memory_id, camper_id, emoji }) {
    // Check if reaction exists
    const existing = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_memory_reactions WHERE memory_id = $1 AND camper_id = $2 AND emoji = $3 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [memory_id, camper_id, emoji],
      { label: "Check existing reaction" }
    );

    if (existing.length > 0) {
      // Remove reaction
      await ctx.integrations.apps_database.execute(
        `DELETE FROM camp201_memory_reactions WHERE memory_id = $1 AND camper_id = $2 AND emoji = $3`,
        [memory_id, camper_id, emoji],
        { label: "Remove reaction" }
      );
      return { success: true, action: "removed" as const };
    } else {
      // Add reaction
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_memory_reactions (memory_id, camper_id, emoji) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [memory_id, camper_id, emoji],
        { label: "Add reaction" }
      );
      return { success: true, action: "added" as const };
    }
  },
});
