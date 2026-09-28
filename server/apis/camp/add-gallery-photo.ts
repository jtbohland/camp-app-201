import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "AddGalleryPhoto",
  description: "Adds a photo to the gallery for the active cohort",
  integrations: {
    camp_201_db: postgres(APPS_DB),
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
    const cohort = await ctx.integrations.camp_201_db.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortSchema,
      undefined,
      { label: "Get active cohort" }
    );
    const cohortId = cohort.length > 0 ? cohort[0].id : null;

    const InsertSchema = z.object({ id: z.coerce.number() });
    const result = await ctx.integrations.camp_201_db.query(
      `INSERT INTO camp201_gallery (image_url, caption, day_number, uploaded_by, cohort_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      InsertSchema,
      [input.image_url, input.caption, input.day_number, input.uploaded_by, cohortId],
      { label: "Add gallery photo" }
    );

    return { success: true, photo_id: result[0].id };
  },
});
