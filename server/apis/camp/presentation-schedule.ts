import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const ScheduleItemSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  description: z.string().nullable(),
  instructions: z.string().nullable(),
  resources: z.any(),
  prep_time_minutes: z.coerce.number().nullable(),
  present_time_minutes: z.coerce.number().nullable(),
  /** null = in the bank (not shown to cAMPers). */
  day_number: z.coerce.number().nullable(),
  sort_order: z.coerce.number(),
  status: z.string(),
  is_locked: z.boolean(),
  deck_template_url: z.string().nullable(),
  presentation_type: z.string(),
});

/** Number of cAMP days set on the Agenda (3–5). */
async function getNumDays(db: any): Promise<number> {
  const rows = await db.query(
    `SELECT value FROM camp201_config WHERE key = 'num_days' LIMIT 1`,
    z.object({ value: z.string() }),
    undefined,
    { label: "Get number of cAMP days" }
  );
  const n = parseInt(rows[0]?.value ?? "", 10);
  return Number.isFinite(n) && n >= 1 && n <= 5 ? n : 3;
}

export const GetPresentationSchedule = api({
  name: "GetPresentationSchedule",
  description: "Counselor view of every presentation, by day or in the bank",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    num_days: z.number(),
    items: z.array(ScheduleItemSchema),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const numDays = await getNumDays(db);
    const items = await db.query(
      `SELECT id, title, description, instructions, COALESCE(resources, '[]'::jsonb) AS resources,
              prep_time_minutes, present_time_minutes,
              NULLIF(day_number, 0) AS day_number,
              COALESCE(sort_order, 0) AS sort_order,
              COALESCE(status, 'upcoming') AS status,
              COALESCE(is_locked, true) AS is_locked,
              deck_template_url,
              COALESCE(presentation_type, 'standard') AS presentation_type
       FROM camp201_presentations
       ORDER BY NULLIF(day_number, 0) NULLS FIRST, sort_order, id
       LIMIT 200`,
      ScheduleItemSchema,
      undefined,
      { label: "Get presentation schedule" }
    );
    return { num_days: numDays, items };
  },
});

export const SavePresentationSchedule = api({
  name: "SavePresentationSchedule",
  description: "Saves which day and order each presentation shows in",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    layout: z
      .array(
        z.object({
          id: z.number().int(),
          /** null sends it back to the bank (hidden from cAMPers). */
          day_number: z.number().int().min(1).max(5).nullable(),
          sort_order: z.number().int().min(0),
        })
      )
      .max(200),
  }),
  output: z.object({ updated: z.number() }),
  async run(ctx, { layout }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    if (layout.length === 0) return { updated: 0 };

    const numDays = await getNumDays(db);
    if (layout.some((l) => l.day_number !== null && l.day_number > numDays)) {
      throw new Error(`cAMP has ${numDays} days on the Agenda. Pick Day 1–${numDays}.`);
    }

    // One statement for the whole board so a move never leaves it half-saved.
    const result = await db.execute(
      `UPDATE camp201_presentations p
       SET day_number = l.day_number, sort_order = l.sort_order
       FROM unnest($1::int[], $2::int[], $3::int[]) AS l(id, day_number, sort_order)
       WHERE p.id = l.id`,
      [
        layout.map((l) => l.id),
        layout.map((l) => l.day_number),
        layout.map((l) => l.sort_order),
      ],
      { label: "Save presentation schedule" }
    );
    return { updated: result.rowCount ?? layout.length };
  },
});
