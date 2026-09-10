import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "TogglePresentationLock",
  description: "Toggles the is_locked flag on a presentation",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    presentation_id: z.number(),
    is_locked: z.boolean(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { presentation_id, is_locked }) {
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_presentations SET is_locked = $1 WHERE id = $2`,
      [is_locked, presentation_id],
      { label: `${is_locked ? "Lock" : "Unlock"} presentation ${presentation_id}` }
    );
    return { success: true };
  },
});
