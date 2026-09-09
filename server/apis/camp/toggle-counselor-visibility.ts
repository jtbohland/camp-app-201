import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "ToggleCounselorVisibility",
  description: "Toggles whether a counselor is displayed on the cohort page",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    visible: z.boolean(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { camper_id, visible }) {
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_campers SET visible_in_cohort = $2 WHERE id = $1 AND role IN ('counselor', 'admin')`,
      [camper_id, visible],
      { label: "Toggle counselor visibility" }
    );
    return { success: true };
  },
});
