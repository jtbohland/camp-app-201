import { api, z, postgres } from "@superblocksteam/sdk-api";
import { markPreworkComplete } from "../../lib/prework-complete.js";
import { isChallengerExempt } from "../../lib/challenger-exempt.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

// Wheel & Deal valid score range (hidden from campers)
const WD_MIN = 4;
const WD_MAX = 15;

const SUPPORTED_ITEMS = ["wheel_and_deal", "challenger_sales"];

const isImage = (v: unknown) => typeof v === "string" && v.startsWith("data:image/");

export default api({
  name: "SubmitPreworkValidation",
  description: "Saves Wheel & Deal or Challenger proof and marks the task complete",
  integrations: {
    camp_201_db: postgres(APPS_DB),
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
    already_completed: z.boolean(),
    /** Finished after the pre-work deadline: marked done, for 0 points. */
    past_deadline: z.boolean(),
  }),
  async run(ctx, { camper_id, item_key, submission_data }) {
    const db = ctx.integrations.camp_201_db;
    const fail = (message: string) => ({
      success: false, flagged: false, message, auto_completed: false, points_awarded: 0, already_completed: false,
      past_deadline: false,
    });

    if (!SUPPORTED_ITEMS.includes(item_key)) return fail("This task can't be submitted here.");
    const data = (submission_data ?? {}) as Record<string, any>;

    const camperRows = await db.query(
      `SELECT role FROM camp201_campers WHERE id = $1 LIMIT 1`,
      z.object({ role: z.string().nullable() }),
      [camper_id],
      { label: "Look up camper role" }
    );
    if (camperRows.length === 0) return fail("cAMPer not found.");
    const role = camperRows[0].role;

    // Already done? Leave it exactly as it is (answers stay locked, no extra points).
    const existing = await db.query(
      `SELECT 1 AS done FROM camp201_prework WHERE user_id = $1 AND item = $2 AND completed = true LIMIT 1`,
      z.object({ done: z.coerce.number() }),
      [camper_id, item_key],
      { label: "Check if already complete" }
    );
    if (existing.length > 0) {
      return { success: true, flagged: false, message: "Already complete.", auto_completed: false, points_awarded: 0, already_completed: true, past_deadline: false };
    }

    let flagged = false;
    let saved: Record<string, any> = {};
    let exempt = false;

    if (item_key === "wheel_and_deal") {
      const product = String(data.product ?? "").trim();
      const challengeType = String(data.challenge_type ?? "").trim();
      const score = Number(data.score);
      const aiScore = Number(data.ai_coach_score);
      if (!product || !challengeType || data.score === "" || data.ai_coach_score === "" || !Number.isFinite(score) || !Number.isFinite(aiScore)) {
        return fail("Please fill in every field.");
      }
      if (score < WD_MIN || score > WD_MAX || aiScore < WD_MIN || aiScore > WD_MAX) flagged = true;
      if (score === aiScore && score === WD_MAX) flagged = true;
      saved = { product, challenge_type: challengeType, score, ai_coach_score: aiScore };
    }

    if (item_key === "challenger_sales") {
      if (data.auto_completed === true) {
        if (!isChallengerExempt(role)) return fail("Please upload both course screenshots.");
        exempt = true;
        saved = { auto_completed: true, reason: `Role: ${role} (completed Challenger in cAMP Ascent)` };
      } else {
        const shots = Array.isArray(data.screenshots) ? data.screenshots : [];
        const valid = shots
          .filter((s: any) => s && typeof s.course === "string" && isImage(s.image))
          .map((s: any) => ({ course: String(s.course), image: String(s.image) }));
        if (valid.length < 2) return fail("Please upload a screenshot for both courses.");
        saved = { screenshots: valid, courses_completed: valid.map((s: { course: string }) => s.course) };
      }
    }

    await db.execute(
      `INSERT INTO camp201_prework_submissions (camper_id, item_key, submission_data, flagged)
       VALUES ($1, $2, $3::jsonb, $4)
       ON CONFLICT (camper_id, item_key) DO UPDATE
       SET submission_data = $3::jsonb, flagged = $4, created_at = NOW()`,
      [camper_id, item_key, JSON.stringify(saved), flagged],
      { label: `Save ${item_key} submission` }
    );

    // Exempt roles earn the same pre-work points: they did Challenger in cAMP Ascent, which didn't carry over.
    const result = await markPreworkComplete(db, camper_id, item_key, { flagged, awardPoints: true });

    return {
      success: true,
      flagged,
      message: flagged ? "Submitted — but your scores look off. A counselor will review." : "Complete!",
      auto_completed: exempt,
      points_awarded: result.pointsAwarded + result.earlyBirdPoints,
      already_completed: !result.newlyCompleted,
      past_deadline: result.pastDeadline,
    };
  },
});
