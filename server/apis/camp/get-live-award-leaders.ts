import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, requireCounselor, resolveViewCohort } from "../../lib/cohort.js";
import { spiritWinnersSql, SpiritWinnerSchema } from "../../lib/spirit.js";
import { wheelLeadersSql } from "./get-wheel-leaderboard.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const IdSchema = z.object({ camper_id: z.coerce.number() });
const WheelSchema = z.object({ camper_id: z.coerce.number(), avg_delta: z.coerce.number().nullable() });

export default api({
  name: "GetLiveAwardLeaders",
  description: "Counselor-only: who currently leads cAMP-V-P, Camp Spirit and Wheel & Deal",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    cohort_id: z.number().nullable(),
  }),
  output: z.object({
    camp_vp_ids: z.array(z.number()),
    spirit_ids: z.array(z.number()),
    spirit_votes: z.number(),
    wheel_dealer_ids: z.array(z.number()),
  }),
  async run(ctx, { cohort_id }) {
    const db = ctx.integrations.camp_201_db;
    // Live award standings are a counselor-only preview (Camp Spirit stays a surprise for cAMPers).
    await requireCounselor(db, ctx.user.email);

    const cohortId = cohort_id ?? (await resolveViewCohort(db, ctx.user.email)).cohortId;
    if (!cohortId) return { camp_vp_ids: [], spirit_ids: [], spirit_votes: 0, wheel_dealer_ids: [] };
    const cohortSql = cohortIdSql(cohortId);

    const [vp, spirit, wheel] = await Promise.all([
      // cAMP-V-P: most individual points right now (ties share the pill).
      db.query(
        `SELECT c.id AS camper_id FROM camp201_campers c
          WHERE c.cohort_id = $1 AND c.removed_at IS NULL
            AND (c.role IS NULL OR c.role NOT IN ('counselor', 'admin'))
            AND c.points > 0
            AND c.points = (SELECT MAX(c2.points) FROM camp201_campers c2
                             WHERE c2.cohort_id = $1 AND c2.removed_at IS NULL
                               AND (c2.role IS NULL OR c2.role NOT IN ('counselor', 'admin')))
          ORDER BY c.id LIMIT 10`,
        IdSchema,
        [cohortId],
        { label: "Current cAMP-V-P leader" },
      ),
      // Camp Spirit: same rule Close cAMP uses to award it.
      db.query(spiritWinnersSql(cohortSql), SpiritWinnerSchema, undefined, { label: "Current Camp Spirit leader" }),
      // Wheel Dealer: same ranking Close cAMP uses (smallest self-vs-room gap).
      db.query(wheelLeadersSql(cohortSql, 1), WheelSchema, undefined, { label: "Current Wheel & Deal leader" }),
    ]);

    return {
      camp_vp_ids: vp.map((r) => r.camper_id),
      spirit_ids: spirit.map((r) => r.camper_id),
      spirit_votes: spirit[0]?.vote_count ?? 0,
      wheel_dealer_ids: wheel.filter((r) => r.avg_delta !== null).map((r) => r.camper_id),
    };
  },
});
