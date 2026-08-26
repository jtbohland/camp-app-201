import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "CreateAnnouncement",
  description: "Posts a new counselor announcement to the active cohort",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    title: z.string(),
    body: z.string(),
    priority: z.enum(["normal", "important", "urgent"]),
    pinned: z.boolean(),
    created_by: z.number(),
  }),
  output: z.object({ success: z.boolean(), announcement_id: z.number() }),
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
      `INSERT INTO camp201_announcements (title, body, priority, pinned, created_by, cohort_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      InsertSchema,
      [input.title, input.body, input.priority, input.pinned, input.created_by, cohortId],
      { label: "Create announcement" }
    );

    return { success: true, announcement_id: result[0].id };
  },
});
