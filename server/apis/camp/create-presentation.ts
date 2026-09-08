import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "CreatePresentation",
  description: "Creates a new presentation assignment.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    title: z.string(),
    description: z.string().nullable(),
    instructions: z.string().nullable(),
    resources: z.string().nullable(), // JSON array of { label, url }
    prep_time_minutes: z.number().nullable(),
    present_time_minutes: z.number().nullable(),
    team_id: z.number().nullable(),
    day_number: z.number().nullable(),
    created_by: z.number(),
  }),
  output: z.object({ success: z.boolean(), id: z.coerce.number() }),
  async run(ctx, input) {
    const result = await ctx.integrations.camp_db.query(
      `INSERT INTO camp201_presentations (title, description, instructions, resources, prep_time_minutes, present_time_minutes, team_id, day_number, created_by)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [
        input.title,
        input.description,
        input.instructions,
        input.resources ?? "[]",
        input.prep_time_minutes,
        input.present_time_minutes,
        input.team_id,
        input.day_number,
        input.created_by,
      ],
      { label: "Create presentation" }
    );

    return { success: true, id: result[0].id };
  },
});
