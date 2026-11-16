import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getActiveCohortId, getCounselorAccess, requireCounselor } from "../../lib/cohort.js";
import { isCampClosed } from "../../lib/camp-closed-guard.js";
import {
  RoundPresentationSchema, RoundTeamSchema, loadPresentingTeams, loadRound, loadRoundPresentations, saveRound,
  type RoundState,
} from "../../lib/presentation-round.js";
import { isFullyScored, loadRubricResults, resultKey } from "../../lib/score-visibility.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";
/** cAMPers can press Randomize; this stops a double-tap from skipping a team. Counselors aren't limited. */
const CAMPER_COOLDOWN_MS = 20_000;

const PickedSchema = RoundTeamSchema.extend({
  position: z.number(),
  is_up_now: z.boolean(),
  /** Shown once every judge has scored this team (or counselors revealed scores). Null otherwise. */
  score: z.object({ avg_total: z.number(), max: z.number() }).nullable(),
  judges_scored: z.number(),
});

const RoundOutput = z.object({
  is_counselor: z.boolean(),
  presentations: z.array(RoundPresentationSchema),
  active: RoundPresentationSchema.nullable(),
  picked: z.array(PickedSchema),
  up_now: RoundTeamSchema.nullable(),
  remaining: z.number(),
  total_teams: z.number(),
  judges_needed: z.number(),
  /** Every team has gone. */
  all_picked: z.boolean(),
  /** Every team has gone and (for rubric sessions) every judge has scored every team. */
  round_complete: z.boolean(),
  /** Teams that still need at least one judge's score (rubric sessions only). */
  waiting_on_scores: z.number(),
});
type RoundOutputT = z.infer<typeof RoundOutput>;

async function buildRound(db: any, email: string | undefined): Promise<RoundOutputT> {
  const access = await getCounselorAccess(db, email);
  const cohortId = await getActiveCohortId(db);
  const presentations = await loadRoundPresentations(db);
  const empty: RoundOutputT = {
    is_counselor: access.isAdmin, presentations, active: null, picked: [], up_now: null,
    remaining: 0, total_teams: 0, judges_needed: 0, all_picked: false, round_complete: false, waiting_on_scores: 0,
  };
  if (cohortId === null) return empty;

  const [{ state }, teams] = await Promise.all([loadRound(db, cohortId), loadPresentingTeams(db, cohortId)]);
  const active = presentations.find((p) => p.id === state.active_presentation_id) ?? null;
  if (!active) return { ...empty, total_teams: teams.length, remaining: teams.length };

  const teamById = new Map(teams.map((t) => [t.id, t]));
  const pickIds = (state.picks[String(active.id)] ?? []).filter((id) => teamById.has(id));
  const revealed = await db.query(
    `SELECT COALESCE(scores_revealed, false) AS revealed FROM camp201_presentations WHERE id = $1 LIMIT 1`,
    z.object({ revealed: z.boolean() }),
    [active.id],
    { label: "Check manual score reveal" }
  );
  const manualReveal = revealed[0]?.revealed === true;

  const rubricId = active.rubric_template_id;
  const { results, requiredJudges } = rubricId !== null
    ? await loadRubricResults(db, cohortId, [rubricId])
    : { results: new Map(), requiredJudges: 0 };

  const picked = pickIds.map((id, idx) => {
    const team = teamById.get(id)!;
    const r = rubricId !== null ? results.get(resultKey(rubricId, id)) : undefined;
    const judgesScored = r?.judge_count ?? 0;
    const visible = !!r && (isFullyScored(judgesScored, requiredJudges) || manualReveal);
    return {
      ...team,
      position: idx + 1,
      is_up_now: idx === pickIds.length - 1,
      score: visible ? { avg_total: Number(r!.avg_total), max: Number(r!.max) } : null,
      judges_scored: judgesScored,
    };
  });

  const remaining = teams.filter((t) => !pickIds.includes(t.id)).length;
  const allPicked = teams.length > 0 && remaining === 0;
  const waiting = rubricId === null ? 0 : picked.filter((p) => !isFullyScored(p.judges_scored, requiredJudges)).length;

  return {
    is_counselor: access.isAdmin,
    presentations,
    active,
    picked,
    up_now: picked.length ? teamById.get(pickIds[pickIds.length - 1]) ?? null : null,
    remaining,
    total_teams: teams.length,
    judges_needed: requiredJudges,
    all_picked: allPicked,
    round_complete: allPicked && waiting === 0,
    waiting_on_scores: waiting,
  };
}

/** The live presenting round: which session, who's up, who's done (with scores once every judge scores). */
export const GetPresentationRound = api({
  name: "GetPresentationRound",
  description: "Gets the live presenting round, picks and scores",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: RoundOutput,
  async run(ctx) {
    return buildRound(ctx.integrations.camp_201_db, ctx.user.email);
  },
});

/** Randomly picks the next team that hasn't presented yet for the active session. */
export const PickNextPresenter = api({
  name: "PickNextPresenter",
  description: "Randomly picks the next team to present",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string(), team_name: z.string().nullable() }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const email = (ctx.user.email ?? "").toLowerCase();
    if (!email) throw new Error("You must be signed in.");
    if (await isCampClosed(db)) throw new Error("cAMP is closed.");
    const cohortId = await getActiveCohortId(db);
    if (cohortId === null) throw new Error("There's no active cohort.");

    const access = await getCounselorAccess(db, email);
    if (!access.isAdmin) {
      const me = await db.query(
        `SELECT 1 AS ok FROM camp201_campers WHERE lower(email) = $1 AND cohort_id = $2 AND removed_at IS NULL LIMIT 1`,
        z.object({ ok: z.coerce.number() }),
        [email, cohortId],
        { label: "Check camper is in the live cohort" }
      );
      if (!me[0]) throw new Error("Only cAMPers in this cohort can randomize.");
    }

    const { state, raw } = await loadRound(db, cohortId);
    if (state.active_presentation_id === null) {
      return { success: false, message: "A counselor needs to pick the presentation first.", team_name: null };
    }
    if (!access.isAdmin && state.last_pick_at && Date.now() - Date.parse(state.last_pick_at) < CAMPER_COOLDOWN_MS) {
      return { success: false, message: "A team was just picked. Give them a moment!", team_name: null };
    }

    const teams = await loadPresentingTeams(db, cohortId);
    if (teams.length === 0) return { success: false, message: "There are no teams with cAMPers in this cohort yet.", team_name: null };
    const key = String(state.active_presentation_id);
    const already = new Set(state.picks[key] ?? []);
    const pool = teams.filter((t) => !already.has(t.id));
    if (pool.length === 0) return { success: false, message: "Every team has already presented.", team_name: null };

    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const next: RoundState = {
      ...state,
      picks: { ...state.picks, [key]: [...(state.picks[key] ?? []), chosen.id] },
      last_pick_at: new Date().toISOString(),
    };
    if (!(await saveRound(db, cohortId, raw, next))) {
      return { success: false, message: "Someone else just picked a team. Take a look!", team_name: null };
    }
    return { success: true, message: `${chosen.name} is up!`, team_name: chosen.name };
  },
});

/** Counselor controls: start a presentation's round, undo the last pick, or end the round. */
export const SetPresentationRound = api({
  name: "SetPresentationRound",
  description: "Counselor starts, undoes, or ends a presenting round",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    action: z.enum(["start", "undo_last", "restart", "end"]),
    presentation_id: z.number().nullable(),
  }),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx, { action, presentation_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const cohortId = await getActiveCohortId(db);
    if (cohortId === null) throw new Error("There's no active cohort.");

    const { state, raw } = await loadRound(db, cohortId);
    let next: RoundState = { ...state, picks: { ...state.picks } };
    let message = "";

    if (action === "start") {
      if (presentation_id === null) throw new Error("Pick a presentation.");
      const valid = (await loadRoundPresentations(db)).find((p) => p.id === presentation_id);
      if (!valid) throw new Error("That isn't a team presentation.");
      // Teams picked earlier for this presentation stay picked, so restarting picks up where it left off.
      next = { ...next, active_presentation_id: presentation_id, last_pick_at: null };
      message = `${valid.title} is now the live presentation.`;
    } else {
      if (state.active_presentation_id === null) return { success: false, message: "No presentation is running." };
      const key = String(state.active_presentation_id);
      if (action === "undo_last") {
        const list = state.picks[key] ?? [];
        if (list.length === 0) return { success: false, message: "No team has been picked yet." };
        next.picks[key] = list.slice(0, -1);
        next.last_pick_at = null;
        message = "Last pick undone.";
      } else if (action === "restart") {
        next.picks[key] = [];
        next.last_pick_at = null;
        message = "Round restarted. Every team can be picked again.";
      } else {
        next = { ...next, active_presentation_id: null, last_pick_at: null };
        message = "Round ended.";
      }
    }

    if (!(await saveRound(db, cohortId, raw, next))) {
      return { success: false, message: "Someone else just changed the round. Try again." };
    }
    return { success: true, message };
  },
});
