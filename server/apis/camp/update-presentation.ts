import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "UpdatePresentation",
  description: "Updates a presentation's content, timing, deck link, lock state, and rubric",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
    title: z.string(),
    description: z.string().nullable(),
    instructions: z.string().nullable(),
    resources: z.string().nullable(), // JSON string of [{label, url}]
    prep_time_minutes: z.number().nullable(),
    present_time_minutes: z.number().nullable(),
    day_number: z.number().nullable(),
    sort_order: z.number().nullable(),
    deck_template_url: z.string().nullable(),
    is_locked: z.boolean(),
    status: z.string(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_presentations SET
        title = $2,
        description = $3,
        instructions = $4,
        resources = $5::jsonb,
        prep_time_minutes = $6,
        present_time_minutes = $7,
        day_number = $8,
        sort_order = $9,
        deck_template_url = $10,
        is_locked = $11,
        status = $12
      WHERE id = $1`,
      [
        input.id,
        input.title,
        input.description,
        input.instructions,
        input.resources ?? "[]",
        input.prep_time_minutes,
        input.present_time_minutes,
        input.day_number,
        input.sort_order ?? 0,
        input.deck_template_url ?? "",
        input.is_locked,
        input.status,
      ],
      { label: "Update presentation" }
    );
    return { success: true };
  },
});
