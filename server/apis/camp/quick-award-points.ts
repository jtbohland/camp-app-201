import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "QuickAwardPoints",
  description: "Awards points to a camper. Supports team-unique reasons (one per team).",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    points: z.number().min(1).max(50),
    reason: z.string(),
    awarded_by: z.number(),
    category: z.string().nullable(),
    team_unique: z.boolean().optional(), // If true, only award if no teammate has the same reason
  }),
  output: z.object({ success: z.boolean(), id: z.coerce.number(), already_found: z.boolean() }),
  async run(ctx, { camper_id, points, reason, awarded_by, category, team_unique }) {
    const db = ctx.integrations.apps_database;

    // Team-unique check: prevent duplicate easter eggs per team
    // If camper isn't on a team, fall back to per-camper duplicate check
    if (team_unique) {
      const dupes = await db.query(
        `SELECT COUNT(*)::int AS cnt FROM camp201_points_log pl
         WHERE pl.reason = $1
           AND (
             pl.camper_id = $2
             OR pl.camper_id IN (
               SELECT tm2.user_id FROM camp201_team_members tm1
               JOIN camp201_team_members tm2 ON tm2.team_id = tm1.team_id
               WHERE tm1.user_id = $2
             )
           )`,
        z.object({ cnt: z.coerce.number() }),
        [reason, camper_id],
        { label: "Check team-unique points" }
      );
      if (dupes[0].cnt > 0) {
        return { success: true, id: 0, already_found: true };
      }
    }

    const result = await db.query(
      `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [camper_id, points, reason, awarded_by.toString(), category ?? "bonus"],
      { label: "Quick award points" }
    );
    return { success: true, id: result[0].id, already_found: false };
  },
});
