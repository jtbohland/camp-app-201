import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const EntrySchema = z.object({
  id: z.coerce.number(),
  points: z.coerce.number(),
  reason: z.string(),
  created_at: z.string(),
  running_total: z.coerce.number(),
  /** Counted only on the team total, not the cAMPer's own points. */
  team_only: z.boolean(),
  /** A counselor removed this entry (an offsetting entry exists). */
  reversed: z.boolean(),
  /** This entry is a counselor removal of another entry. */
  is_reversal: z.boolean(),
});

/**
 * The signed-in cAMPer's own point log, newest first, exactly as recorded: every award, deduction
 * and correction, with a running total. Always reads the caller's own entries (never another cAMPer's).
 */
export default api({
  name: "GetMyPointsHistory",
  description: "cAMPer reads their own full point log",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    entries: z.array(EntrySchema),
    total: z.number(),
    earned: z.number(),
    lost: z.number(),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const email = (ctx.user.email ?? "").trim().toLowerCase();
    if (!email) throw new Error("You must be signed in.");

    const [entries, totals] = await Promise.all([
      db.query(
        `WITH me AS (SELECT id FROM camp201_campers WHERE LOWER(email) = $1 LIMIT 1),
         logged AS (
           SELECT pl.id, pl.points, COALESCE(pl.reason, '') AS reason, pl.created_at,
                  (COALESCE(pl.category, '') = 'team_award') AS team_only,
                  EXISTS (SELECT 1 FROM camp201_points_log r WHERE r.reverses_id = pl.id) AS reversed,
                  (pl.reverses_id IS NOT NULL) AS is_reversal,
                  SUM(CASE WHEN COALESCE(pl.category, '') = 'team_award' THEN 0 ELSE pl.points END)
                    OVER (ORDER BY pl.created_at, pl.id) AS running_total
           FROM camp201_points_log pl JOIN me ON me.id = pl.camper_id
         )
         SELECT id, points, reason,
                to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS created_at,
                running_total, team_only, reversed, is_reversal
         FROM logged
         WHERE points <> 0
         ORDER BY created_at DESC, id DESC
         LIMIT 500`,
        EntrySchema,
        [email],
        { label: "My point log" }
      ),
      db.query(
        `WITH me AS (SELECT id, COALESCE(points, 0) AS points FROM camp201_campers WHERE LOWER(email) = $1 LIMIT 1)
         SELECT (SELECT points FROM me)::int AS total,
                COALESCE(SUM(pl.points) FILTER (WHERE pl.points > 0), 0)::int AS earned,
                COALESCE(-SUM(pl.points) FILTER (WHERE pl.points < 0), 0)::int AS lost
         FROM camp201_points_log pl JOIN me ON me.id = pl.camper_id
         WHERE COALESCE(pl.category, '') <> 'team_award'
           AND pl.reverses_id IS NULL
           AND NOT EXISTS (SELECT 1 FROM camp201_points_log r WHERE r.reverses_id = pl.id)`,
        z.object({ total: z.coerce.number().nullable(), earned: z.coerce.number(), lost: z.coerce.number() }),
        [email],
        { label: "My point totals" }
      ),
    ]);

    return {
      entries,
      total: totals[0]?.total ?? 0,
      earned: totals[0]?.earned ?? 0,
      lost: totals[0]?.lost ?? 0,
    };
  },
});
