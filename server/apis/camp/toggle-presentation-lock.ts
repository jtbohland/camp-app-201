import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "TogglePresentationLock",
  description: "Toggles the is_locked flag on a presentation",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    presentation_id: z.number(),
    is_locked: z.boolean(),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { presentation_id, is_locked }) {
    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_presentations SET is_locked = $1 WHERE id = $2`,
      [is_locked, presentation_id],
      { label: `${is_locked ? "Lock" : "Unlock"} presentation ${presentation_id}` }
    );
    return { success: true };
  },
});
