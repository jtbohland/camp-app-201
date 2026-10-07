import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, resolveViewCohort } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetGallery",
  description: "Gets photo gallery entries for the active cohort",
  integrations: {
    camp_201_db: postgres(APPS_DB),
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
    // Active cohort, or the counselor's chosen past cohort.
    const VIEW = cohortIdSql((await resolveViewCohort(ctx.integrations.camp_201_db, ctx.user.email)).cohortId);
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
         JOIN camp201_cohorts co ON co.id = g.cohort_id AND co.id = ${VIEW}
         WHERE g.day_number = $1
         ORDER BY g.created_at DESC LIMIT 50`
      : `SELECT g.id, g.image_url, g.caption, g.day_number, g.likes, g.created_at,
                CONCAT(c.first_name, ' ', c.last_name) as uploaded_by_name
         FROM camp201_gallery g
         LEFT JOIN camp201_campers c ON c.id = g.uploaded_by
         JOIN camp201_cohorts co ON co.id = g.cohort_id AND co.id = ${VIEW}
         ORDER BY g.created_at DESC LIMIT 50`;

    const photos = await ctx.integrations.camp_201_db.query(
      query,
      PhotoSchema,
      day_number ? [day_number] : undefined,
      { label: "Get gallery photos" }
    );

    return { photos };
  },
});
