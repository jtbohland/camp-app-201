import { api, z, postgres } from "@superblocksteam/sdk-api";
import { resolveViewCohort } from "../../lib/cohort.js";
import { getCohortSnapshot, getStandings } from "../../lib/cohort-snapshot.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

// Mini EBR is the final scored presentation (rubric_template_id = 100)
const MINI_EBR_TEMPLATE_ID = 100;

export default api({
  name: "GetCloseCampStatus",
  description: "Checks if all Mini EBR rubrics are submitted and returns close-camp readiness",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    camp_closed: z.boolean(),
    camp_in_session: z.boolean(),
    camp_ready_to_close: z.boolean(),
    counselor_count: z.number(),
    team_count: z.number(),
    scores_submitted: z.number(),
    scores_needed: z.number(),
    camp_vp_camper_id: z.number().nullable(),
    camp_champ_team_id: z.number().nullable(),
    revealed_team_ids: z.array(z.number()),
    vp_revealed: z.boolean(),
    final_survey_unlocked: z.boolean(),
    legacy_wall_cohort_number: z.number().nullable(),
    close_incomplete: z.boolean(),
    viewing_past: z.boolean(),
  }),
  async run(ctx) {
    const CountSchema = z.object({ count: z.coerce.number() });

    // Counselor viewing a past cohort: show that cohort as it ended, podium fully revealed.
    const view = await resolveViewCohort(ctx.integrations.camp_201_db, ctx.user.email);
    if (view.isPast) {
      const db = ctx.integrations.camp_201_db;
      const snapshot = await getCohortSnapshot(db, view.cohortId);
      const { teams } = await getStandings(db, view);
      const ranked = teams.filter((t) => t.name !== "TEST");
      const legacy = await db.query(
        `SELECT value FROM camp201_config WHERE key = $1 LIMIT 1`,
        z.object({ value: z.string() }),
        [`legacy_archived_cohort_${view.cohortId ?? 0}`],
        { label: "Check Legacy Wall marker" }
      );
      return {
        camp_closed: true,
        camp_in_session: false,
        camp_ready_to_close: true,
        counselor_count: snapshot?.counselor_ids.length ?? 0,
        team_count: ranked.length,
        scores_submitted: 0,
        scores_needed: 0,
        camp_vp_camper_id: snapshot?.camp_vp_camper_id ?? null,
        camp_champ_team_id: snapshot?.camp_champ_team_id ?? ranked[0]?.id ?? null,
        revealed_team_ids: ranked.map((t) => t.id),
        vp_revealed: true,
        final_survey_unlocked: snapshot?.final_survey_unlocked ?? false,
        legacy_wall_cohort_number: legacy.length > 0 ? parseInt(legacy[0].value, 10) || null : null,
        close_incomplete: false,
        viewing_past: true,
      };
    }

    // Check if camp is already closed
    const closedResult = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_closed' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Check camp_closed" }
    );
    const campClosed = closedResult.length > 0 && closedResult[0].value === "true";

    // Check if camp is actually in session (has a start date that has passed)
    const startDateResult = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_start_date' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Check camp_start_date" }
    );
    const startDateStr = startDateResult.length > 0 ? startDateResult[0].value.trim() : "";
    const campInSession = startDateStr !== "" && new Date(startDateStr).getTime() <= Date.now();

    // Check ready_to_close flag
    const readyResult = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_ready_to_close' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Check camp_ready_to_close" }
    );
    const readyFlag = readyResult.length > 0 && readyResult[0].value === "true";

    // Get active cohort
    const cohort = await ctx.integrations.camp_201_db.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      undefined,
      { label: "Get active cohort" }
    );
    const cohortId = cohort.length > 0 ? cohort[0].id : null;

    // Count counselors in cohort
    const counselors = await ctx.integrations.camp_201_db.query(
      `SELECT COUNT(*)::int as count FROM camp201_campers
       WHERE role = 'counselor' AND cohort_id = $1`,
      CountSchema,
      [cohortId],
      { label: "Count counselors" }
    );
    const counselorCount = counselors[0]?.count ?? 0;

    // Count teams in cohort (non-test teams)
    const teams = await ctx.integrations.camp_201_db.query(
      `SELECT COUNT(*)::int as count FROM camp201_teams
       WHERE cohort_id = $1 AND name != 'TEST'`,
      CountSchema,
      [cohortId],
      { label: "Count teams" }
    );
    const teamCount = teams[0]?.count ?? 0;

    // Count submitted Mini EBR scores
    const scores = await ctx.integrations.camp_201_db.query(
      `SELECT COUNT(*)::int as count FROM camp201_rubric_scores
       WHERE template_id = $1 AND cohort_id = $2`,
      CountSchema,
      [MINI_EBR_TEMPLATE_ID, cohortId],
      { label: "Count Mini EBR scores" }
    );
    const scoresSubmitted = scores[0]?.count ?? 0;

    // Each counselor scores each team
    const scoresNeeded = counselorCount * teamCount;
    const campReadyToClose = readyFlag || (scoresNeeded > 0 && scoresSubmitted >= scoresNeeded);

    // Get stored winners (after close)
    const vpResult = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_vp_camper_id' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Get cAMP VP" }
    );
    const campVpCamperId = vpResult.length > 0 ? parseInt(vpResult[0].value, 10) || null : null;

    const champResult = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_champ_team_id' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Get cAMP Champ" }
    );
    const campChampTeamId = champResult.length > 0 ? parseInt(champResult[0].value, 10) || null : null;

    // Get revealed team IDs
    const revealedResult = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'revealed_team_ids' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Get revealed teams" }
    );
    let revealedTeamIds: number[] = [];
    if (revealedResult.length > 0) {
      try { revealedTeamIds = JSON.parse(revealedResult[0].value); } catch { /* empty */ }
    }

    // Check if VP is revealed
    const vpRevealedResult = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'vp_revealed' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Check VP revealed" }
    );
    const vpRevealed = vpRevealedResult.length > 0 && vpRevealedResult[0].value === "true";

    // Check if final survey is unlocked
    const finalSurveyResult = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'final_survey_unlocked' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Check final survey" }
    );
    const finalSurveyUnlocked = finalSurveyResult.length > 0 && finalSurveyResult[0].value === "true";

    // Has this cohort been added to the Legacy Wall?
    const legacyResult = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = $1 LIMIT 1`,
      z.object({ value: z.string() }),
      [`legacy_archived_cohort_${cohortId ?? 0}`],
      { label: "Check Legacy Wall marker" }
    );
    const legacyWallCohortNumber = legacyResult.length > 0 ? parseInt(legacyResult[0].value, 10) || null : null;

    // camp_closed is set first; this marker is set last. Closed without the marker = a close that failed part-way.
    const finishedResult = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_close_finished_cohort' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Check close finished" }
    );
    const closeFinished = finishedResult.length > 0 && cohortId !== null && finishedResult[0].value === String(cohortId);

    return {
      camp_closed: campClosed,
      camp_in_session: campInSession,
      camp_ready_to_close: campReadyToClose,
      counselor_count: counselorCount,
      team_count: teamCount,
      scores_submitted: scoresSubmitted,
      scores_needed: scoresNeeded,
      camp_vp_camper_id: campVpCamperId,
      camp_champ_team_id: campChampTeamId,
      revealed_team_ids: revealedTeamIds,
      vp_revealed: vpRevealed,
      final_survey_unlocked: finalSurveyUnlocked,
      legacy_wall_cohort_number: legacyWallCohortNumber,
      close_incomplete: campClosed && !closeFinished,
      viewing_past: false,
    };
  },
});
