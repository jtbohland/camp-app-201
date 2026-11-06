import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const PreworkItemSchema = z.object({
  item: z.string(),
  completed_at: z.string().nullable(),
});

const SubmissionSchema = z.object({
  item_key: z.string(),
  submission_data: z.any(),
  flagged: z.boolean(),
});

export default api({
  name: "GetPreworkStatus",
  description: "Gets a camper's pre-work completions and saved submissions",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    user_id: z.number(),
  }),
  output: z.object({
    completedItems: z.array(PreworkItemSchema),
    submissions: z.array(SubmissionSchema),
    totalItems: z.number(),
  }),
  async run(ctx, { user_id }) {
    const db = ctx.integrations.camp_201_db;
    const [completedItems, submissions, totals] = await Promise.all([
      // Only count completions for tasks that are actually on the pre-work list
      db.query(
        `SELECT p.item, p.completed_at::text
         FROM camp201_prework p
         WHERE p.user_id = $1 AND p.completed = true
           AND EXISTS (SELECT 1 FROM camp201_journey_content jc WHERE jc.section = 'prework' AND jc.item_key = p.item)
         LIMIT 50`,
        PreworkItemSchema,
        [user_id],
        { label: "Fetch pre-work completions" }
      ),
      db.query(
        `SELECT item_key, submission_data, flagged
         FROM camp201_prework_submissions
         WHERE camper_id = $1 AND item_key IN ('wheel_and_deal', 'challenger_sales')
         LIMIT 10`,
        SubmissionSchema,
        [user_id],
        { label: "Fetch saved pre-work submissions" }
      ),
      db.query(
        `SELECT COUNT(*)::int AS total FROM camp201_journey_content
         WHERE section = 'prework' AND item_key IS NOT NULL`,
        z.object({ total: z.coerce.number() }),
        undefined,
        { label: "Count pre-work tasks" }
      ),
    ]);

    return { completedItems, submissions, totalItems: totals[0]?.total ?? 0 };
  },
});
