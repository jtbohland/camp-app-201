import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "ToggleCounselorVisibility",
  description: "Toggles whether a counselor is displayed on the cohort page",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    visible: z.boolean(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { camper_id, visible }) {
    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_campers SET visible_in_cohort = $2 WHERE id = $1 AND role IN ('counselor', 'admin')`,
      [camper_id, visible],
      { label: "Toggle counselor visibility" }
    );
    return { success: true };
  },
});
