import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "RevealCampVP",
  description: "Reveals the cAMP-V-P winner during the podium ceremony",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_config (key, value, updated_at) VALUES ('vp_revealed', 'true', NOW())
       ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW()`,
      undefined,
      { label: "Reveal cAMP-V-P" }
    );
    return { success: true };
  },
});
