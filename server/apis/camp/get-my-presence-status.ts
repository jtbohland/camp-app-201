import { api, z, postgres } from "@superblocksteam/sdk-api";
import { PRESENCE_MEMO_AT } from "../../lib/checkin-penalties.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/**
 * The signed-in cAMPer's late/missed check-in count, and whether they owe a counselor chat about
 * presence. The memo only applies from the cohort set in config `presence_memo_min_cohort_id` on.
 */
export default api({
  name: "GetMyPresenceStatus",
  description: "Signed-in cAMPer's late/missed check-in strikes and memo",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    strikes: z.number(),
    penalty_points: z.number(),
    memo_required: z.boolean(),
  }),
  async run(ctx) {
    const email = (ctx.user.email ?? "").trim().toLowerCase();
    if (!email) return { strikes: 0, penalty_points: 0, memo_required: false };

    const rows = await ctx.integrations.camp_201_db.query(
      `SELECT COUNT(s.*) AS strikes,
              COALESCE(SUM(s.rate), 0) AS penalty_points,
              (c.cohort_id >= COALESCE(NULLIF(btrim(
                 (SELECT value FROM camp201_config WHERE key = 'presence_memo_min_cohort_id' LIMIT 1)), '')::int, 0)
              ) AS memo_enabled
         FROM camp201_campers c
         LEFT JOIN LATERAL camp201_checkin_strikes(c.id) s ON true
        WHERE lower(c.email) = $1 AND c.removed_at IS NULL
        GROUP BY c.id, c.cohort_id
        LIMIT 1`,
      z.object({
        strikes: z.coerce.number(),
        penalty_points: z.coerce.number(),
        memo_enabled: z.boolean().nullable(),
      }),
      [email],
      { label: "My late/missed check-ins" }
    );
    const me = rows[0];
    if (!me) return { strikes: 0, penalty_points: 0, memo_required: false };
    return {
      strikes: me.strikes,
      penalty_points: me.penalty_points,
      memo_required: !!me.memo_enabled && me.strikes >= PRESENCE_MEMO_AT,
    };
  },
});
