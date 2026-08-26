import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetGallery",
  description: "Gets photo gallery entries for the active cohort",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    day_number: z.number().nullable(),
  }),
  output: z.object({
    photos: z.array(z.object({
      id: z.coerce.number(),
      image_url: z.string(),
      caption: z.string().nullable(),
      day_number: z.coerce.number().nullable(),
      uploaded_by_name: z.string().nullable(),
      likes: z.coerce.number(),
      created_at: z.string(),
    })),
  }),
  async run(ctx, { day_number }) {
    const PhotoSchema = z.object({
      id: z.coerce.number(),
      image_url: z.string(),
      caption: z.string().nullable(),
      day_number: z.coerce.number().nullable(),
      uploaded_by_name: z.string().nullable(),
      likes: z.coerce.number(),
      created_at: z.string(),
    });

    const query = day_number
      ? `SELECT g.id, g.image_url, g.caption, g.day_number, g.likes, g.created_at,
                CONCAT(c.first_name, ' ', c.last_name) as uploaded_by_name
         FROM camp201_gallery g
         LEFT JOIN camp201_campers c ON c.id = g.uploaded_by
         JOIN camp201_cohorts co ON co.id = g.cohort_id AND co.is_active = true
         WHERE g.day_number = $1
         ORDER BY g.created_at DESC LIMIT 50`
      : `SELECT g.id, g.image_url, g.caption, g.day_number, g.likes, g.created_at,
                CONCAT(c.first_name, ' ', c.last_name) as uploaded_by_name
         FROM camp201_gallery g
         LEFT JOIN camp201_campers c ON c.id = g.uploaded_by
         JOIN camp201_cohorts co ON co.id = g.cohort_id AND co.is_active = true
         ORDER BY g.created_at DESC LIMIT 50`;

    const photos = await ctx.integrations.apps_database.query(
      query,
      PhotoSchema,
      day_number ? [day_number] : undefined,
      { label: "Get gallery photos" }
    );

    return { photos };
  },
});
