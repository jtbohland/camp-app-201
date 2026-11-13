import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const HubItemSchema = z.object({
  id: z.coerce.number(),
  team_id: z.coerce.number(),
  author_id: z.coerce.number(),
  author_name: z.string(),
  section: z.string(),
  item_type: z.string(),
  title: z.string(),
  content: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

const ScheduledPresSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  presentation_type: z.string(),
  day_number: z.coerce.number(),
  sort_order: z.coerce.number(),
  is_locked: z.boolean(),
});

export default api({
  name: "GetTeamHub",
  description: "Fetches hub items and the scheduled presentations for dynamic workspace tabs",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    team_id: z.number(),
  }),
  output: z.object({
    items: z.array(HubItemSchema),
    /** Presentations that have a day assigned — drives the workspace tabs. */
    scheduled_presentations: z.array(ScheduledPresSchema),
  }),
  async run(ctx, { team_id }) {
    const db = ctx.integrations.camp_201_db;

    const [items, scheduled] = await Promise.all([
      db.query(
        `SELECT h.id, h.team_id, h.author_id,
                (c.first_name || ' ' || c.last_name) AS author_name,
                h.section, h.item_type, h.title, h.content,
                h.created_at::text, h.updated_at::text
         FROM camp201_hub_items h
         JOIN camp201_campers c ON c.id = h.author_id
         WHERE h.team_id = $1
         ORDER BY h.created_at DESC
         LIMIT 200`,
        HubItemSchema,
        [team_id],
        { label: "Fetch team hub items" }
      ),
      db.query(
        `SELECT id, title, presentation_type,
                day_number, COALESCE(sort_order, 0) AS sort_order,
                COALESCE(is_locked, true) AS is_locked
         FROM camp201_presentations
         WHERE day_number IS NOT NULL
         ORDER BY day_number, sort_order, id
         LIMIT 50`,
        ScheduledPresSchema,
        undefined,
        { label: "Fetch scheduled presentations for hub tabs" }
      ),
    ]);

    return { items, scheduled_presentations: scheduled };
  },
});
