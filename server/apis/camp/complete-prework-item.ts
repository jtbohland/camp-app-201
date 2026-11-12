import { api, z, postgres } from "@superblocksteam/sdk-api";
import { markPreworkComplete } from "../../lib/prework-complete.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";
const PENALTY_POINTS = -3;

export default api({
  name: "CompletePreworkItem",
  description: "Marks pre-work complete with link validation. Warning first, penalty on repeat skip.",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    user_id: z.number(),
    item: z.string(),
    content_id: z.number().nullable(),
    force: z.boolean(), // true = user clicked "Complete Anyway" after warning
  }),
  output: z.object({
    success: z.boolean(),
    pointsAwarded: z.number(),
    warning: z.boolean(),
    missing_links: z.array(z.object({ label: z.string(), url: z.string() })),
    missing_profile_fields: z.array(z.string()),
    penalty_applied: z.boolean(),
    /** Finished after the pre-work deadline: marked done, for 0 points. */
    past_deadline: z.boolean(),
    /** Early-bird bonus earned by finishing the last pre-work task (0 if none). */
    early_bird_points: z.number(),
  }),
  async run(ctx, { user_id, item, content_id, force }) {
    let missing_links: { label: string; url: string }[] = [];
    let missing_profile_fields: string[] = [];

    // Pre-work finished after the deadline still counts as done, for 0 points (checked in markPreworkComplete).

    // === SPECIAL CASE: Registration/Profile completion ===
    if (item === "complete_registration") {
      const camperRows = await ctx.integrations.camp_201_db.query(
        `SELECT bio, fun_fact, goal_1, goal_2, goal_3, ice_breaker_answers
         FROM camp201_campers WHERE id = $1 LIMIT 1`,
        z.object({
          bio: z.string().nullable(),
          fun_fact: z.string().nullable(),
          goal_1: z.string().nullable(),
          goal_2: z.string().nullable(),
          goal_3: z.string().nullable(),
          ice_breaker_answers: z.any().nullable(),
        }),
        [user_id],
        { label: "Check profile completion" }
      );

      if (camperRows.length > 0) {
        const c = camperRows[0];
        if (!c.bio?.trim()) missing_profile_fields.push("Bio");
        if (!c.fun_fact?.trim()) missing_profile_fields.push("Fun Fact");
        if (!c.goal_1?.trim()) missing_profile_fields.push("Goal 1");
        if (!c.goal_2?.trim()) missing_profile_fields.push("Goal 2");
        if (!c.goal_3?.trim()) missing_profile_fields.push("Goal 3");

        // Check ice breaker answers (need all 16)
        const answers = (c.ice_breaker_answers && typeof c.ice_breaker_answers === "object") ? c.ice_breaker_answers : {};
        const answeredCount = Object.keys(answers).filter(k => answers[k]?.trim()).length;
        if (answeredCount < 16) {
          missing_profile_fields.push(`Ice Breaker Questions (${answeredCount}/16 answered)`);
        }
      }

      if (missing_profile_fields.length > 0 && !force) {
        return { success: false, pointsAwarded: 0, warning: true, missing_links: [], missing_profile_fields, penalty_applied: false, past_deadline: false, early_bird_points: 0 };
      }

      // If forcing with missing fields, check for prior attempts (penalty logic)
      if (missing_profile_fields.length > 0 && force && content_id) {
        const attempts = await ctx.integrations.camp_201_db.query(
          `SELECT COUNT(*)::int AS cnt FROM camp201_completion_attempts
           WHERE camper_id = $1 AND content_id = $2 AND links_missing > 0`,
          z.object({ cnt: z.coerce.number() }),
          [user_id, content_id],
          { label: "Count prior profile skip attempts" }
        );

        await ctx.integrations.camp_201_db.execute(
          `INSERT INTO camp201_completion_attempts (camper_id, content_id, links_missing)
           VALUES ($1, $2, $3)`,
          [user_id, content_id, missing_profile_fields.length],
          { label: "Log profile completion attempt" }
        );

        if (attempts[0].cnt >= 1) {
          await ctx.integrations.camp_201_db.execute(
            `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
             VALUES ($1, $2, $3, 'system')`,
            [user_id, PENALTY_POINTS, "Marked registration complete with incomplete profile"],
            { label: "Log profile skip penalty" }
          );
        }
      }
    }

    // === SUBMISSION-GATED ITEMS (Wheel & Deal, Challenger) ===
    const SUBMISSION_GATED = ["wheel_and_deal", "challenger_sales"];
    let submissionFlagged = false;
    if (SUBMISSION_GATED.includes(item)) {
      const submissions = await ctx.integrations.camp_201_db.query(
        `SELECT flagged FROM camp201_prework_submissions WHERE camper_id = $1 AND item_key = $2 LIMIT 1`,
        z.object({ flagged: z.boolean() }),
        [user_id, item],
        { label: "Check prework submission" }
      );
      if (submissions.length === 0) {
        return {
          success: false, pointsAwarded: 0, warning: true,
          missing_links: [], missing_profile_fields: [item === "wheel_and_deal" ? "Submit your Wheel & Deal results first" : "Upload your Challenger course screenshots first"],
          penalty_applied: false, past_deadline: false, early_bird_points: 0,
        };
      }
      submissionFlagged = submissions[0].flagged;
    }

    // === LINK-BASED VALIDATION (for non-registration, non-submission-gated items) ===
    if (item !== "complete_registration" && !SUBMISSION_GATED.includes(item) && content_id && content_id > 0) {
      // Get the content item's links
      const contentRows = await ctx.integrations.camp_201_db.query(
        "SELECT links FROM camp201_journey_content WHERE id = $1 LIMIT 1",
        z.object({ links: z.any() }),
        [content_id],
        { label: "Get content links" }
      );

      const allLinks: { label: string; url: string }[] = contentRows.length > 0
        ? (Array.isArray(contentRows[0].links) ? contentRows[0].links : [])
        : [];

      if (allLinks.length > 0) {
        // Get which links this camper has clicked
        const clickedRows = await ctx.integrations.camp_201_db.query(
          "SELECT link_url FROM camp201_link_clicks WHERE camper_id = $1 AND content_id = $2 LIMIT 50",
          z.object({ link_url: z.string() }),
          [user_id, content_id],
          { label: "Get clicked links for item" }
        );
        const clickedUrls = new Set(clickedRows.map((r) => r.link_url));

        missing_links = allLinks.filter((l) => !clickedUrls.has(l.url));
      }
    }

    // If there are missing links and user hasn't forced completion
    if (missing_links.length > 0 && !force) {
      return {
        success: false,
        pointsAwarded: 0,
        warning: true,
        missing_links,
        missing_profile_fields: [],
        penalty_applied: false,
        past_deadline: false,
        early_bird_points: 0,
      };
    }

    // If forcing with missing links — check for prior attempt
    let penalty_applied = false;
    if (missing_links.length > 0 && force && content_id) {
      // Count prior failed attempts
      const attempts = await ctx.integrations.camp_201_db.query(
        `SELECT COUNT(*)::int AS cnt FROM camp201_completion_attempts
         WHERE camper_id = $1 AND content_id = $2 AND links_missing > 0`,
        z.object({ cnt: z.coerce.number() }),
        [user_id, content_id],
        { label: "Count prior skip attempts" }
      );

      // Log this attempt
      await ctx.integrations.camp_201_db.execute(
        `INSERT INTO camp201_completion_attempts (camper_id, content_id, links_missing)
         VALUES ($1, $2, $3)`,
        [user_id, content_id, missing_links.length],
        { label: "Log completion attempt" }
      );

      // If this is the 2nd+ attempt, apply penalty
      if (attempts[0].cnt >= 1) {
        penalty_applied = true;
        await ctx.integrations.camp_201_db.execute(
          `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by)
           VALUES ($1, $2, $3, 'system')`,
          [user_id, PENALTY_POINTS, `Marked "${item}" complete without finishing required links`],
          { label: "Log skip penalty" }
        );
      }
    }

    // Insert completion (ignore if already done)
    // Mark complete + award points (first time only). Shared with Challenger / Wheel & Deal.
    const skipPenalty = penalty_applied;
    const completion = await markPreworkComplete(ctx.integrations.camp_201_db, user_id, item, {
      flagged: submissionFlagged,
      awardPoints: true,
    });
    penalty_applied = skipPenalty || completion.penaltyApplied;
    const netPoints = completion.pointsAwarded + completion.earlyBirdPoints + (skipPenalty ? PENALTY_POINTS : 0);

    return {
      success: true,
      pointsAwarded: netPoints,
      warning: false,
      missing_links: [],
      missing_profile_fields: [],
      penalty_applied,
      past_deadline: completion.pastDeadline,
      early_bird_points: completion.earlyBirdPoints,
    };
  },
});
