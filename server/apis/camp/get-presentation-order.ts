import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const ConfigSchema = z.object({
  value: z.string(),
});

export default api({
  name: "GetPresentationOrder",
  description: "Fetch the active presentation order",
  integrations: {
    apps_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    active: z.boolean(),
    label: z.string().nullable(),
    order: z.array(z.object({
      position: z.number(),
      team_id: z.number(),
      team_name: z.string(),
    })),
  }),
  async run(ctx) {
    const rows = await ctx.integrations.apps_db.query(
      `SELECT value FROM camp201_config WHERE key = 'active_presentation_order'`,
      ConfigSchema,
      [],
      { label: "Get active presentation order" },
    );

    if (rows.length === 0) {
      return { active: false, label: null, order: [] };
    }

    try {
      const parsed = JSON.parse(rows[0].value);
      return {
        active: true,
        label: parsed.label ?? null,
        order: parsed.order ?? [],
      };
    } catch {
      return { active: false, label: null, order: [] };
    }
  },
});
