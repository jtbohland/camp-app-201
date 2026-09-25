import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

// Badge IDs
const SUMMIT_SEEKER_ID = 2;   // 100+ points
const PEAK_PERFORMER_ID = 3;  // 250+ points
const LEGEND_LAKE_ID = 4;     // 500+ points
const CAMP_SPIRIT_ID = 11;    // Peer-voted (already awarded before close)
const WHEEL_DEALER_ID = 34;   // Top of W&D leaderboard
const CAMP_VP_ID = 199;       // cAMP-V-P (most individual points)
const ALPINE_LEGEND_ID = 105; // cAMP-V-P + Wheel Dealer + Camp Spirit

const MILESTONE_BADGES = [
  { id: SUMMIT_SEEKER_ID, threshold: 100, points: 5 },
  { id: PEAK_PERFORMER_ID, threshold: 250, points: 10 },
  { id: LEGEND_LAKE_ID, threshold: 500, points: 20 },
];

export default api({
  name: "CloseCamp",
  description: "Idempotent close-camp: awards final badges, determines winners, freezes points",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    closer_camper_id: z.number(),
  }),
  output: z.object({
    success: z.boolean(),
    already_closed: z.boolean(),
    message: z.string(),
    camp_vp: z.object({ camper_id: z.number(), name: z.string(), points: z.number() }).nullable(),
    camp_champ: z.object({ team_id: z.number(), name: z.string(), total: z.number() }).nullable(),
    alpine_legends: z.array(z.object({ camper_id: z.number(), name: z.string() })),
    milestone_awards: z.number(),
    wheel_dealer_awarded: z.boolean(),
  }),
  async run(ctx, { closer_camper_id }) {
    // ─── Idempotency check ───────────────────────────
    const closedResult = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_closed' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Idempotency check" }
    );
    if (closedResult.length > 0 && closedResult[0].value === "true") {
      // Already closed — return stored results
      const vpResult = await ctx.integrations.camp_201_db.query(
        `SELECT value FROM camp201_config WHERE key = 'camp_vp_camper_id' LIMIT 1`,
        z.object({ value: z.string() }), undefined, { label: "Get stored VP" }
      );
      const champResult = await ctx.integrations.camp_201_db.query(
        `SELECT value FROM camp201_config WHERE key = 'camp_champ_team_id' LIMIT 1`,
        z.object({ value: z.string() }), undefined, { label: "Get stored Champ" }
      );
      return {
        success: true,
        already_closed: true,
        message: "cAMP was already closed. No changes made.",
        camp_vp: null,
        camp_champ: null,
        alpine_legends: [],
        milestone_awards: 0,
        wheel_dealer_awarded: false,
      };
    }

    // ─── Set camp_closed FIRST (prevents race condition) ──
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_config (key, value, updated_at) VALUES ('camp_closed', 'true', NOW())
       ON CONFLICT (key) DO UPDATE SET value = 'true', updated_at = NOW()`,
      undefined,
      { label: "Set camp_closed = true" }
    );

    // Get active cohort
    const cohort = await ctx.integrations.camp_201_db.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      z.object({ id: z.coerce.number() }), undefined, { label: "Get active cohort" }
    );
    const cohortId = cohort.length > 0 ? cohort[0].id : 1;

    // Lock all presentations
    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_presentations SET is_locked = true`,
      undefined,
      { label: "Lock all presentations" }
    );

    // ─── 1. Award milestone badges ──────────────────────
    const CamperSchema = z.object({
      id: z.coerce.number(),
      points: z.coerce.number(),
      first_name: z.string(),
      last_name: z.string(),
    });
    const allCampers = await ctx.integrations.camp_201_db.query(
      `SELECT id, points, first_name, last_name FROM camp201_campers
       WHERE cohort_id = $1 AND role NOT IN ('counselor', 'admin')
       LIMIT 200`,
      CamperSchema,
      [cohortId],
      { label: "Get all campers for milestone check" }
    );

    let milestoneAwards = 0;
    for (const badge of MILESTONE_BADGES) {
      const qualifying = allCampers.filter((c) => c.points >= badge.threshold);
      for (const camper of qualifying) {
        // Idempotent: check if already awarded
        const existing = await ctx.integrations.camp_201_db.query(
          `SELECT id FROM camp201_camper_badges WHERE camper_id = $1 AND badge_id = $2 LIMIT 1`,
          z.object({ id: z.coerce.number() }),
          [camper.id, badge.id],
          { label: `Check milestone ${badge.id} for camper ${camper.id}` }
        );
        if (existing.length === 0) {
          await ctx.integrations.camp_201_db.execute(
            `INSERT INTO camp201_camper_badges (camper_id, badge_id, awarded_at, awarded_by)
             VALUES ($1, $2, NOW(), $3)`,
            [camper.id, badge.id, closer_camper_id],
            { label: `Award milestone ${badge.id}` }
          );
          if (badge.points > 0) {
            await ctx.integrations.camp_201_db.execute(
              `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
              [badge.points, camper.id],
              { label: `Add milestone points ${badge.points}` }
            );
            await ctx.integrations.camp_201_db.execute(
              `INSERT INTO camp201_points_log (camper_id, points, reason, category, cohort_id)
               VALUES ($1, $2, $3, 'badge', $4)`,
              [camper.id, badge.points, `Milestone badge: ${badge.threshold}+ points`, cohortId],
              { label: `Log milestone points` }
            );
          }
          milestoneAwards++;
        }
      }
    }

    // ─── 2. Award Wheel Dealer to Top Dealer ────────────
    let wheelDealerAwarded = false;
    const topDealer = await ctx.integrations.camp_201_db.query(
      `SELECT r.pitcher_id as camper_id, COALESCE(SUM(DISTINCT r.points_awarded), 0) as total_points
       FROM camp201_wheel_rounds r
       WHERE r.status = 'closed'
       GROUP BY r.pitcher_id
       ORDER BY total_points DESC, COUNT(DISTINCT r.id) DESC
       LIMIT 1`,
      z.object({ camper_id: z.coerce.number(), total_points: z.coerce.number() }),
      undefined,
      { label: "Get top W&D dealer" }
    );
    if (topDealer.length > 0) {
      const dealerId = topDealer[0].camper_id;
      const existingWD = await ctx.integrations.camp_201_db.query(
        `SELECT id FROM camp201_camper_badges WHERE camper_id = $1 AND badge_id = $2 LIMIT 1`,
        z.object({ id: z.coerce.number() }),
        [dealerId, WHEEL_DEALER_ID],
        { label: "Check Wheel Dealer already awarded" }
      );
      if (existingWD.length === 0) {
        await ctx.integrations.camp_201_db.execute(
          `INSERT INTO camp201_camper_badges (camper_id, badge_id, awarded_at, awarded_by)
           VALUES ($1, $2, NOW(), $3)`,
          [dealerId, WHEEL_DEALER_ID, closer_camper_id],
          { label: "Award Wheel Dealer badge" }
        );
        wheelDealerAwarded = true;
      }
    }

    // ─── 3. Determine cAMP-V-P (top individual points) ──
    // Re-read campers with final points (milestone badges may have added points)
    const finalCampers = await ctx.integrations.camp_201_db.query(
      `SELECT id, points, first_name, last_name FROM camp201_campers
       WHERE cohort_id = $1 AND role NOT IN ('counselor', 'admin')
       ORDER BY points DESC
       LIMIT 1`,
      CamperSchema,
      [cohortId],
      { label: "Get cAMP-V-P winner" }
    );
    let campVp: { camper_id: number; name: string; points: number } | null = null;
    if (finalCampers.length > 0) {
      campVp = {
        camper_id: finalCampers[0].id,
        name: `${finalCampers[0].first_name} ${finalCampers[0].last_name}`,
        points: finalCampers[0].points,
      };
      await ctx.integrations.camp_201_db.execute(
        `INSERT INTO camp201_config (key, value, updated_at) VALUES ('camp_vp_camper_id', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [String(campVp.camper_id)],
        { label: "Store cAMP-V-P" }
      );

      // Award cAMP-V-P badge
      await ctx.integrations.camp_201_db.execute(
        `INSERT INTO camp201_camper_badges (camper_id, badge_id, awarded_at, earn_count)
         VALUES ($1, $2, NOW(), 1)
         ON CONFLICT (camper_id, badge_id) DO NOTHING`,
        [campVp.camper_id, CAMP_VP_ID],
        { label: "Award cAMP-V-P badge" }
      );
    }

    // ─── 4. Determine cAMP Champ (top team) ─────────────
    const TeamTotalSchema = z.object({
      team_id: z.coerce.number(),
      team_name: z.string(),
      total: z.coerce.number(),
    });
    const teamTotals = await ctx.integrations.camp_201_db.query(
      `SELECT t.id as team_id, t.name as team_name,
              COALESCE(SUM(c.points), 0) + COALESCE(t.team_points, 0) as total
       FROM camp201_teams t
       LEFT JOIN camp201_campers c ON c.team_id = t.id AND c.role NOT IN ('counselor', 'admin')
       WHERE t.cohort_id = $1 AND t.name != 'TEST'
       GROUP BY t.id, t.name, t.team_points
       ORDER BY total DESC
       LIMIT 1`,
      TeamTotalSchema,
      [cohortId],
      { label: "Get cAMP Champ team" }
    );
    let campChamp: { team_id: number; name: string; total: number } | null = null;
    if (teamTotals.length > 0) {
      campChamp = {
        team_id: teamTotals[0].team_id,
        name: teamTotals[0].team_name,
        total: teamTotals[0].total,
      };
      await ctx.integrations.camp_201_db.execute(
        `INSERT INTO camp201_config (key, value, updated_at) VALUES ('camp_champ_team_id', $1, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
        [String(campChamp.team_id)],
        { label: "Store cAMP Champ" }
      );
    }

    // ─── 5. Alpine Legend check ──────────────────────────
    // Requires: cAMP-V-P + Wheel Dealer + Camp Spirit (all 3 on same person)
    const alpineLegends: { camper_id: number; name: string }[] = [];
    if (campVp) {
      const vpId = campVp.camper_id;
      // Check if VP also has Wheel Dealer and Camp Spirit badges
      const vpBadges = await ctx.integrations.camp_201_db.query(
        `SELECT badge_id FROM camp201_camper_badges
         WHERE camper_id = $1 AND badge_id = ANY($2::int[])`,
        z.object({ badge_id: z.coerce.number() }),
        [vpId, [WHEEL_DEALER_ID, CAMP_SPIRIT_ID]],
        { label: "Check Alpine Legend eligibility" }
      );
      const hasBadgeIds = new Set(vpBadges.map((b) => b.badge_id));
      if (hasBadgeIds.has(WHEEL_DEALER_ID) && hasBadgeIds.has(CAMP_SPIRIT_ID)) {
        // Award Alpine Legend idempotently
        const existingAL = await ctx.integrations.camp_201_db.query(
          `SELECT id FROM camp201_camper_badges WHERE camper_id = $1 AND badge_id = $2 LIMIT 1`,
          z.object({ id: z.coerce.number() }),
          [vpId, ALPINE_LEGEND_ID],
          { label: "Check Alpine Legend exists" }
        );
        if (existingAL.length === 0) {
          await ctx.integrations.camp_201_db.execute(
            `INSERT INTO camp201_camper_badges (camper_id, badge_id, awarded_at, awarded_by)
             VALUES ($1, $2, NOW(), $3)`,
            [vpId, ALPINE_LEGEND_ID, closer_camper_id],
            { label: "Award Alpine Legend" }
          );
          // +25 points
          await ctx.integrations.camp_201_db.execute(
            `UPDATE camp201_campers SET points = points + 25 WHERE id = $1`,
            [vpId],
            { label: "Add Alpine Legend points" }
          );
          await ctx.integrations.camp_201_db.execute(
            `INSERT INTO camp201_points_log (camper_id, points, reason, category, cohort_id)
             VALUES ($1, 25, 'Alpine Legend — the rarest badge at cAMP!', 'badge', $2)`,
            [vpId, cohortId],
            { label: "Log Alpine Legend points" }
          );
        }
        alpineLegends.push({ camper_id: vpId, name: campVp.name });
      }
    }

    // ─── 6. Initialize reveal state (all hidden) ────────
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_config (key, value, updated_at) VALUES ('revealed_team_ids', '[]', NOW())
       ON CONFLICT (key) DO UPDATE SET value = '[]', updated_at = NOW()`,
      undefined,
      { label: "Init revealed_team_ids" }
    );
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_config (key, value, updated_at) VALUES ('vp_revealed', 'false', NOW())
       ON CONFLICT (key) DO UPDATE SET value = 'false', updated_at = NOW()`,
      undefined,
      { label: "Init vp_revealed" }
    );

    // ─── 7. Log the close event ─────────────────────────
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_config (key, value, updated_at) VALUES ('camp_closed_at', NOW()::text, NOW())
       ON CONFLICT (key) DO UPDATE SET value = NOW()::text, updated_at = NOW()`,
      undefined,
      { label: "Log close timestamp" }
    );
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_config (key, value, updated_at) VALUES ('camp_closed_by', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [String(closer_camper_id)],
      { label: "Log closer" }
    );

    return {
      success: true,
      already_closed: false,
      message: `🏕️ cAMP is closed! ${milestoneAwards} milestone badges awarded.`,
      camp_vp: campVp,
      camp_champ: campChamp,
      alpine_legends: alpineLegends,
      milestone_awards: milestoneAwards,
      wheel_dealer_awarded: wheelDealerAwarded,
    };
  },
});
