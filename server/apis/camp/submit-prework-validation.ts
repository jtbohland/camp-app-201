import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

// Wheel & Deal valid score range (hidden from campers)
const WD_MIN = 4;
const WD_MAX = 15;

// Roles that auto-complete Challenger (already did it elsewhere)
const CHALLENGER_EXEMPT_ROLES = ["ae", "sdr", "psm", "renewals"];

export default api({
  name: "SubmitPreworkValidation",
  description: "Submit Wheel & Deal scores or Challenger screenshots for pre-work validation",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    item_key: z.string(),
    submission_data: z.any(), // JSONB — different shape per item_key
  }),
  output: z.object({
    success: z.boolean(),
    flagged: z.boolean(),
    message: z.string(),
    auto_completed: z.boolean(),
    points_awarded: z.number(),
  }),
  async run(ctx, { camper_id, item_key, submission_data }) {
    const data = submission_data as Record<string, any>;
    let flagged = false;

    // === WHEEL & DEAL VALIDATION ===
    if (item_key === "wheel_and_deal") {
      const score = Number(data.score);
      const aiScore = Number(data.ai_coach_score);

      // Flag if scores are outside valid range (camper didn't actually do it)
      if (score < WD_MIN || score > WD_MAX || aiScore < WD_MIN || aiScore > WD_MAX) {
        flagged = true;
      }
      // Also flag if scores are suspiciously round or identical
      if (score === aiScore && score === 15) {
        flagged = true;
      }
    }

    // === CHALLENGER VALIDATION ===
    if (item_key === "challenger_sales") {
      // Check if screenshots were uploaded
      const screenshots = data.screenshots as any[];
      if (!screenshots || screenshots.length === 0) {
        return { success: false, flagged: false, message: "Please upload at least one course completion screenshot", auto_completed: false, points_awarded: 0 };
      }
    }

    // Save submission
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_prework_submissions (camper_id, item_key, submission_data, flagged)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (camper_id, item_key) DO UPDATE
       SET submission_data = $3::jsonb, flagged = $4, created_at = NOW()`,
      [camper_id, item_key, JSON.stringify(data), flagged],
      { label: `Save ${item_key} submission` }
    );

    // Auto-complete the prework item
    const result = await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_prework (user_id, item, completed)
       VALUES ($1, $2, true)
       ON CONFLICT (user_id, item) DO NOTHING`,
      [camper_id, item_key],
      { label: "Mark prework complete" }
    );

    let pointsAwarded = 0;
    if (result.rowCount && result.rowCount > 0) {
      pointsAwarded = flagged ? 0 : 5; // No points if flagged
      if (pointsAwarded > 0) {
        await ctx.integrations.apps_database.execute(
          `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
          [pointsAwarded, camper_id],
          { label: "Award prework points" }
        );
        await ctx.integrations.apps_database.execute(
          `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, category)
           VALUES ($1, $2, $3, 'system', 'pre_work')`,
          [camper_id, pointsAwarded, `Pre-work submitted: ${item_key}`],
          { label: "Log prework points" }
        );
      }
    }

    return {
      success: true,
      flagged,
      message: flagged
        ? "Submitted — but your scores look off. A counselor will review."
        : "Submitted successfully!",
      auto_completed: false,
      points_awarded: pointsAwarded,
    };
  },
});
