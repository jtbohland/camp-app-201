import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "AddGalleryPhoto",
  description: "Adds a photo to the gallery for the active cohort",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    image_url: z.string(),
    caption: z.string().nullable(),
    day_number: z.number().nullable(),
    uploaded_by: z.number(),
  }),
  output: z.object({ success: z.boolean(), photo_id: z.number() }),
  async run(ctx, input) {
    const CohortSchema = z.object({ id: z.coerce.number() });
    const cohort = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortSchema,
      undefined,
      { label: "Get active cohort" }
    );
    const cohortId = cohort.length > 0 ? cohort[0].id : null;

    const InsertSchema = z.object({ id: z.coerce.number() });
    const result = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_gallery (image_url, caption, day_number, uploaded_by, cohort_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      InsertSchema,
      [input.image_url, input.caption, input.day_number, input.uploaded_by, cohortId],
      { label: "Add gallery photo" }
    );

    return { success: true, photo_id: result[0].id };
  },
});
