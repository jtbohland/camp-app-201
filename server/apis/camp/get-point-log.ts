import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor, resolveViewCohort } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const EntrySchema = z.object({
  id: z.coerce.number(),
  camper_id: z.coerce.number(),
  camper_name: z.string(),
  points: z.coerce.number(),
  reason: z.string(),
  awarded_by: z.string().nullable(),
  created_at: z.string(),
  running_total: z.coerce.number(),
});

/** Optional filter: null = no filter. Dates are YYYY-MM-DD and times HH:MM, both Pacific. */
const nullableStr = z.string().trim().max(20).nullable();

export default api({
  name: "GetPointLog",
  description: "Counselors read the full, filterable point log",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number().int().positive().nullable(),
    date_from: nullableStr,
    date_to: nullableStr,
    time_from: nullableStr,
    time_to: nullableStr,
    points: z.number().int().nullable(),
    page: z.number().int().min(0).max(10000),
    page_size: z.number().int().min(1).max(5000),
  }),
  output: z.object({
    entries: z.array(EntrySchema),
    total_count: z.number(),
    points_sum: z.number(),
    campers: z.array(z.object({ id: z.coerce.number(), name: z.string() })),
    point_values: z.array(z.coerce.number()),
  }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const view = await resolveViewCohort(db, ctx.user.email);
    const cohortId = view.cohortId;

    const okDate = (v: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const okTime = (v: string | null) => (v && /^\d{2}:\d{2}$/.test(v) ? v : null);

    // $1 cohort, $2 camper, $3/$4 date range, $5/$6 time-of-day range, $7 points.
    const params = [
      cohortId,
      input.camper_id,
      okDate(input.date_from),
      okDate(input.date_to),
      okTime(input.time_from),
      okTime(input.time_to),
      input.points,
    ];

    // Running total is computed over each cAMPer's whole history, before any filter.
    const base = `
      WITH logged AS (
        SELECT pl.id, pl.camper_id, pl.points, pl.reason, pl.awarded_by, pl.created_at,
               (pl.created_at AT TIME ZONE 'America/Los_Angeles') AS pt,
               SUM(pl.points) OVER (PARTITION BY pl.camper_id ORDER BY pl.created_at, pl.id) AS running_total
        FROM camp201_points_log pl
        JOIN camp201_campers c ON c.id = pl.camper_id
        WHERE ($1::int IS NULL OR c.cohort_id = $1::int)
      ),
      filtered AS (
        SELECT l.*, TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) AS camper_name
        FROM logged l
        JOIN camp201_campers c ON c.id = l.camper_id
        WHERE ($2::int IS NULL OR l.camper_id = $2::int)
          AND ($3::date IS NULL OR l.pt::date >= $3::date)
          AND ($4::date IS NULL OR l.pt::date <= $4::date)
          AND ($5::time IS NULL OR l.pt::time >= $5::time)
          AND ($6::time IS NULL OR l.pt::time <= ($6::time + interval '59 seconds'))
          AND ($7::int IS NULL OR l.points = $7::int)
      )`;

    const [entries, totals, campers, values] = await Promise.all([
      db.query(
        `${base}
         SELECT id, camper_id, camper_name, points, COALESCE(reason, '') AS reason, awarded_by,
                to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
                running_total
         FROM filtered
         ORDER BY created_at DESC, id DESC
         LIMIT $8 OFFSET $9`,
        EntrySchema,
        [...params, input.page_size, input.page * input.page_size],
        { label: "Read point log page" }
      ),
      db.query(
        `${base} SELECT COUNT(*)::int AS n, COALESCE(SUM(points), 0)::int AS s FROM filtered`,
        z.object({ n: z.coerce.number(), s: z.coerce.number() }),
        params,
        { label: "Count point log" }
      ),
      db.query(
        `SELECT DISTINCT c.id, TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')) AS name
         FROM camp201_points_log pl JOIN camp201_campers c ON c.id = pl.camper_id
         WHERE ($1::int IS NULL OR c.cohort_id = $1::int)
         ORDER BY name LIMIT 1000`,
        z.object({ id: z.coerce.number(), name: z.string() }),
        [cohortId],
        { label: "List cAMPers in log" }
      ),
      db.query(
        `SELECT DISTINCT pl.points FROM camp201_points_log pl JOIN camp201_campers c ON c.id = pl.camper_id
         WHERE ($1::int IS NULL OR c.cohort_id = $1::int) AND pl.points <> 0
         ORDER BY pl.points DESC LIMIT 200`,
        z.object({ points: z.coerce.number() }),
        [cohortId],
        { label: "List point values" }
      ),
    ]);

    return {
      entries,
      total_count: totals[0]?.n ?? 0,
      points_sum: totals[0]?.s ?? 0,
      campers,
      point_values: values.map((v) => v.points),
    };
  },
});
