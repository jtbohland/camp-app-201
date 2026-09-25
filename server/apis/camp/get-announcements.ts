import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetAnnouncements",
  description: "Gets recent announcements for the active cohort",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    announcements: z.array(z.object({
      id: z.coerce.number(),
      title: z.string(),
      body: z.string(),
      priority: z.string(),
      pinned: z.boolean(),
      author_name: z.string().nullable(),
      created_at: z.string(),
    })),
  }),
  async run(ctx) {
    const AnnouncementSchema = z.object({
      id: z.coerce.number(),
      title: z.string(),
      body: z.string(),
      priority: z.string(),
      pinned: z.boolean(),
      author_name: z.string().nullable(),
      created_at: z.string(),
    });

    const announcements = await ctx.integrations.camp_201_db.query(
      `SELECT a.id, a.title, a.body, a.priority, a.pinned, a.created_at,
              CONCAT(c.first_name, ' ', c.last_name) as author_name
       FROM camp201_announcements a
       LEFT JOIN camp201_campers c ON c.id = a.created_by
       JOIN camp201_cohorts co ON co.id = a.cohort_id AND co.is_active = true
       ORDER BY a.pinned DESC, a.created_at DESC
       LIMIT 30`,
      AnnouncementSchema,
      undefined,
      { label: "Get announcements" }
    );

    return { announcements };
  },
});
