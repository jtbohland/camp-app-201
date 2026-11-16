import { api, z, postgres } from "@superblocksteam/sdk-api";
import { awardRepeatableBadge } from "../../lib/award-badge.js";
import { BADGE_IDS, PEER_FEEDBACK_POINTS } from "../../lib/accelerator.js";
import { PAID_REVIEWS_PER_PRESENTATION, loadFeedbackWindow } from "../../lib/feedback-window.js";
import { isCampClosed } from "../../lib/camp-closed-guard.js";
import { getActiveCohortId } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const ItemSchema = z.object({
  category: z.enum(["sunshine", "rain", "trail_notes"]),
  content: z.string().trim().min(1).max(1000),
});

/**
 * One cAMPfire review: every Glow, Grow, and Trail note for one team's presentation, saved together.
 * The author is the signed-in cAMPer. Each cAMPer can review a team once per presentation, never their own team.
 * Reviews are only accepted for the live presentation, for teams that have already presented, while the
 * feedback window is open. Each review earns a flat 3 pts, for up to 3 reviews per presentation (9 max).
 */
export default api({
  name: "SubmitPeerFeedback",
  description: "Saves one cAMPer's peer review for a team and awards points",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    session_label: z.string().trim().min(1),
    team_id: z.number(),
    items: z.array(ItemSchema).min(1).max(10),
  }),
  output: z.object({
    success: z.boolean(),
    error: z.enum(["already_submitted", "own_team", "closed", "not_presented"]).nullable(),
    points_awarded: z.number(),
  }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    const email = (ctx.user.email ?? "").toLowerCase();
    if (!email) throw new Error("You must be signed in.");
    if (await isCampClosed(db)) throw new Error("cAMP is closed — feedback is no longer accepted.");

    const gate = await db.query(
      `SELECT is_locked FROM camp201_feature_gates WHERE feature_key = 'peer_feedback' LIMIT 1`,
      z.object({ is_locked: z.boolean() }),
      undefined,
      { label: "Check peer_feedback gate" }
    );
    if (gate[0]?.is_locked) throw new Error("Peer feedback is currently locked by your counselor.");

    const cohortId = await getActiveCohortId(db);
    if (cohortId === null) throw new Error("There's no active cohort.");

    // Only the live presentation, only while its feedback window is open, only teams that have gone.
    const fbWindow = await loadFeedbackWindow(db, cohortId);
    if (
      fbWindow.presentation_title === null ||
      fbWindow.presentation_title !== input.session_label ||
      fbWindow.status === "closed" ||
      fbWindow.status === "none"
    ) {
      return { success: false, error: "closed" as const, points_awarded: 0 };
    }
    if (!fbWindow.reviewable_team_ids.includes(input.team_id)) {
      return { success: false, error: "not_presented" as const, points_awarded: 0 };
    }

    const me = await db.query(
      `SELECT id, team_id FROM camp201_campers WHERE lower(email) = $1 AND removed_at IS NULL ORDER BY id DESC LIMIT 1`,
      z.object({ id: z.coerce.number(), team_id: z.coerce.number().nullable() }),
      [email],
      { label: "Find signed-in cAMPer" }
    );
    if (!me[0]) throw new Error("Finish your cAMP profile before giving feedback.");
    const authorId = me[0].id;
    if (me[0].team_id === input.team_id) return { success: false, error: "own_team" as const, points_awarded: 0 };

    const team = await db.query(
      `SELECT id FROM camp201_teams WHERE id = $1 AND cohort_id IS NOT DISTINCT FROM $2 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [input.team_id, cohortId],
      { label: "Check team is in the live cohort" }
    );
    if (!team[0]) throw new Error("That team isn't in this cohort.");

    // Saves every line in one statement, only if this cAMPer hasn't reviewed this team for this presentation.
    const inserted = await db.query(
      `WITH existing AS (
         SELECT 1 FROM camp201_peer_feedback
         WHERE author_id = $1 AND team_id = $2 AND session_label = $3
           AND cohort_id IS NOT DISTINCT FROM $4
         LIMIT 1
       ), ins AS (
         INSERT INTO camp201_peer_feedback (session_label, team_id, author_id, category, content, cohort_id, points_awarded)
         SELECT $3, $2, $1, x.category, x.content, $4, 0
         FROM unnest($5::text[], $6::text[]) AS x(category, content)
         WHERE NOT EXISTS (SELECT 1 FROM existing)
         RETURNING id
       ) SELECT COUNT(*)::int AS n FROM ins`,
      z.object({ n: z.coerce.number() }),
      [authorId, input.team_id, input.session_label, cohortId, input.items.map((i) => i.category), input.items.map((i) => i.content)],
      { label: "Save peer feedback" }
    );
    if ((inserted[0]?.n ?? 0) === 0) return { success: false, error: "already_submitted" as const, points_awarded: 0 };

    // Flat 3 pts per review, for the first 3 reviews this cAMPer gives on this presentation.
    const reviewed = await db.query(
      `SELECT COUNT(DISTINCT team_id)::int AS n FROM camp201_peer_feedback
       WHERE author_id = $1 AND session_label = $2 AND cohort_id IS NOT DISTINCT FROM $3`,
      z.object({ n: z.coerce.number() }),
      [authorId, input.session_label, cohortId],
      { label: "Count this cAMPer's reviews for the presentation" }
    );
    const paid = (reviewed[0]?.n ?? 0) <= PAID_REVIEWS_PER_PRESENTATION;
    const badge = await awardRepeatableBadge(
      db, authorId, BADGE_IDS.PEER_FEEDBACK, `Peer feedback: ${input.session_label}`, cohortId,
      paid ? PEER_FEEDBACK_POINTS : 0
    );
    return { success: true, error: null, points_awarded: badge.points };
  },
});
