import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const TeamSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  logo_url: z.string().nullable(),
});

export default api({
  name: "RandomizePresentationOrder",
  description: "Shuffle cohort teams into random presentation order and persist",
  integrations: {
    apps_db: postgres(APPS_DB),
  },
  input: z.object({
    cohort_id: z.number(),
    presentation_label: z.string(),
  }),
  output: z.object({
    success: z.boolean(),
    order: z.array(z.object({
      position: z.number(),
      team_id: z.number(),
      team_name: z.string(),
    })),
  }),
  async run(ctx, { cohort_id, presentation_label }) {
    // Get all teams in this cohort
    const teams = await ctx.integrations.apps_db.query(
      `SELECT id, name, logo_url FROM camp201_teams WHERE cohort_id = $1 ORDER BY id`,
      TeamSchema,
      [cohort_id],
      { label: "Get cohort teams for shuffle" },
    );

    // Fisher-Yates shuffle
    const shuffled = [...teams];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Store the order as JSON in camp201_config
    const order = shuffled.map((t, idx) => ({
      position: idx + 1,
      team_id: t.id,
      team_name: t.name,
    }));

    const key = `presentation_order_${presentation_label.replace(/\s+/g, "_").toLowerCase()}`;
    await ctx.integrations.apps_db.execute(
      `INSERT INTO camp201_config (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
      [key, JSON.stringify(order)],
      { label: "Save presentation order" },
    );

    // Also save as the "active" presentation order
    await ctx.integrations.apps_db.execute(
      `INSERT INTO camp201_config (key, value)
       VALUES ('active_presentation_order', $1)
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [JSON.stringify({ label: presentation_label, order })],
      { label: "Set active presentation order" },
    );

    return { success: true, order };
  },
});
