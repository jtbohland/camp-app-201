import { z } from "@superblocksteam/sdk-api";
import {
  loadPresentingTeams, loadRound, loadRoundPresentations,
  type RoundPresentation, type RoundState, type RoundTeam,
} from "./presentation-round.js";
import { isFullyScored, loadRubricResults, resultKey, type TeamRubricResult } from "./score-visibility.js";

/** How long cAMPers have to finish their reviews after the round is fully scored. */
export const FEEDBACK_GRACE_MS = 10 * 60 * 1000;

/** Reviews per presentation that earn points (3 teams × 3 pts = 9 max per round). */
export const PAID_REVIEWS_PER_PRESENTATION = 3;

export const FeedbackWindowSchema = z.object({
  /**
   * none: no live presentation. open: reviews allowed. closing: round fully scored, grace countdown
   * running. closed: no more reviews for this presentation.
   */
  status: z.enum(["none", "open", "closing", "closed"]),
  presentation_id: z.number().nullable(),
  presentation_title: z.string().nullable(),
  /** When feedback closes on its own (closing status only). */
  closes_at: z.string().nullable(),
  /** Counselor's manual choice, if any. */
  override: z.enum(["closed", "reopened"]).nullable(),
  /** Teams that have presented in the live round (only these can be reviewed). */
  reviewable_team_ids: z.array(z.number()),
});
export type FeedbackWindow = z.infer<typeof FeedbackWindowSchema>;

const NONE: FeedbackWindow = {
  status: "none", presentation_id: null, presentation_title: null, closes_at: null, override: null, reviewable_team_ids: [],
};

const ts = (v: string | null | undefined) => (v ? Date.parse(v) || 0 : 0);

/**
 * Works out whether cAMPfire feedback is open for the live presentation.
 * Only the presentation a counselor started can get feedback, and only for teams that have presented.
 * Once every team has presented (and, for rubric sessions, every judge has scored every team),
 * a 10-minute grace period starts; then feedback closes. Counselors can close early or reopen.
 */
export function computeFeedbackWindow(args: {
  state: RoundState;
  active: RoundPresentation | null;
  teams: RoundTeam[];
  results: Map<string, TeamRubricResult>;
  requiredJudges: number;
  now?: number;
}): FeedbackWindow {
  const { state, active, teams, results, requiredJudges } = args;
  if (!active) return NONE;
  const now = args.now ?? Date.now();
  const key = String(active.id);
  const teamIds = new Set(teams.map((t) => t.id));
  const picked = (state.picks[key] ?? []).filter((id) => teamIds.has(id));
  const override = state.feedback_override[key] ?? null;
  const base = {
    presentation_id: active.id,
    presentation_title: active.title,
    override,
    reviewable_team_ids: picked,
  };

  if (override === "closed") return { ...base, status: "closed", closes_at: null };
  if (override === "reopened") return { ...base, status: "open", closes_at: null };

  const allPicked = teams.length > 0 && picked.length === teams.length;
  if (!allPicked) return { ...base, status: "open", closes_at: null };

  // The moment the round was finished: last team picked, and (rubric sessions) last required score in.
  let completeAt = ts(state.all_picked_at[key]) || ts(state.last_pick_at);
  const rubricId = active.rubric_template_id;
  if (rubricId !== null) {
    for (const id of picked) {
      const r = results.get(resultKey(rubricId, id));
      if (!r || !isFullyScored(r.judge_count, requiredJudges)) {
        return { ...base, status: "open", closes_at: null };
      }
      completeAt = Math.max(completeAt, ts(r.last_scored_at));
    }
  }
  if (!completeAt) completeAt = now;

  const closesAt = completeAt + FEEDBACK_GRACE_MS;
  if (now >= closesAt) return { ...base, status: "closed", closes_at: new Date(closesAt).toISOString() };
  return { ...base, status: "closing", closes_at: new Date(closesAt).toISOString() };
}

/** Loads everything needed and returns the live feedback window for the cohort. */
export async function loadFeedbackWindow(db: any, cohortId: number): Promise<FeedbackWindow> {
  const [{ state }, teams, presentations] = await Promise.all([
    loadRound(db, cohortId),
    loadPresentingTeams(db, cohortId),
    loadRoundPresentations(db),
  ]);
  const active = presentations.find((p) => p.id === state.active_presentation_id) ?? null;
  if (!active) return NONE;
  const { results, requiredJudges } = active.rubric_template_id !== null
    ? await loadRubricResults(db, cohortId, [active.rubric_template_id])
    : { results: new Map<string, TeamRubricResult>(), requiredJudges: 0 };
  return computeFeedbackWindow({ state, active, teams, results, requiredJudges });
}
