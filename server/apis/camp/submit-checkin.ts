import { api, z, postgres } from "@superblocksteam/sdk-api";
import { awardRepeatableBadge } from "../../lib/award-badge.js";
import { BADGE_IDS } from "../../lib/accelerator.js";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SubmitCheckIn",
  description: "Camper submits their check-in with word + PIN verification",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    session_id: z.number(),
    word: z.string(),
    pin: z.string(),
  }),
  output: z.object({
    success: z.boolean(),
    timing: z.string().nullable(),
    points: z.number(),
    error: z.string().nullable(),
    team_complete: z.boolean(),
    first_team: z.boolean(),
  }),
  async run(ctx, input) {
    const { camper_id, session_id, word, pin } = input;

    // Verify PIN
    const CamperSchema = z.object({ pin: z.string().nullable(), team_id: z.number().nullable() });
    const campers = await ctx.integrations.apps_database.query(
      `SELECT pin, team_id FROM camp201_campers WHERE id = $1 LIMIT 1`,
      CamperSchema,
      [camper_id],
      { label: "Verify camper PIN" }
    );

    if (campers.length === 0) {
      return { success: false, timing: null, points: 0, error: "Camper not found", team_complete: false, first_team: false };
    }

    if (!campers[0].pin || campers[0].pin !== pin) {
      return { success: false, timing: null, points: 0, error: "Invalid PIN", team_complete: false, first_team: false };
    }

    const teamId = campers[0].team_id;

    // Check for duplicate check-in
    const ExistingSchema = z.object({ id: z.number() });
    const existing = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_checkin_responses WHERE session_id = $1 AND camper_id = $2 LIMIT 1`,
      ExistingSchema,
      [session_id, camper_id],
      { label: "Check duplicate check-in" }
    );

    if (existing.length > 0) {
      return { success: false, timing: null, points: 0, error: "Already checked in", team_complete: false, first_team: false };
    }

    // Get session details
    const SessionSchema = z.object({
      timer_ends_at: z.string(),
      checkin_opens_at: z.string(),
      status: z.string(),
      first_team_id: z.number().nullable(),
    });
    const sessions = await ctx.integrations.apps_database.query(
      `SELECT timer_ends_at, checkin_opens_at, status, first_team_id FROM camp201_checkin_sessions WHERE id = $1 LIMIT 1`,
      SessionSchema,
      [session_id],
      { label: "Get session for validation" }
    );

    if (sessions.length === 0 || sessions[0].status !== 'active') {
      return { success: false, timing: null, points: 0, error: "Check-in session not active", team_complete: false, first_team: false };
    }

    const session = sessions[0];
    const now = new Date();
    const checkinOpensAt = new Date(session.checkin_opens_at);
    const timerEndsAt = new Date(session.timer_ends_at);

    if (now < checkinOpensAt) {
      return { success: false, timing: null, points: 0, error: "Check-in not open yet", team_complete: false, first_team: false };
    }

    // Validate word (case-insensitive, accept current + previous)
    const elapsedSinceOpen = Math.floor((now.getTime() - checkinOpensAt.getTime()) / 1000);
    const currentSlot = Math.floor(elapsedSinceOpen / 15);
    const previousSlot = Math.max(0, currentSlot - 1);

    const CountSchema = z.object({ count: z.coerce.number() });
    const countResult = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*) as count FROM camp201_word_bank`,
      CountSchema,
      undefined,
      { label: "Count words for validation" }
    );
    const totalWords = countResult[0].count;

    const WordSchema = z.object({ word: z.string() });
    const currentIndex = ((session_id * 7919) + (currentSlot * 104729)) % totalWords;
    const previousIndex = ((session_id * 7919) + (previousSlot * 104729)) % totalWords;

    const currentWords = await ctx.integrations.apps_database.query(
      `SELECT word FROM camp201_word_bank ORDER BY id LIMIT 1 OFFSET $1`,
      WordSchema,
      [currentIndex],
      { label: "Get current valid word" }
    );

    let validWords: string[] = [];
    if (currentWords.length > 0) validWords.push(currentWords[0].word.toUpperCase());

    if (currentSlot > 0) {
      const prevWords = await ctx.integrations.apps_database.query(
        `SELECT word FROM camp201_word_bank ORDER BY id LIMIT 1 OFFSET $1`,
        WordSchema,
        [previousIndex],
        { label: "Get previous valid word" }
      );
      if (prevWords.length > 0) validWords.push(prevWords[0].word.toUpperCase());
    }

    const submittedWord = word.toUpperCase().trim();
    if (!validWords.includes(submittedWord)) {
      return { success: false, timing: null, points: 0, error: "Incorrect word — check the screen and try again", team_complete: false, first_team: false };
    }

    // Determine timing
    const graceEnd = new Date(timerEndsAt.getTime() + 60 * 1000); // 1 min grace
    let timing: string;
    let points: number;

    if (now <= timerEndsAt) {
      timing = "early";
      points = 0; // Will be set by accelerator below
    } else if (now <= graceEnd) {
      timing = "on_time";
      points = 0; // on_time gets no points (only early check-ins earn)
    } else {
      timing = "late";
      points = -2;
    }

    // For early check-ins, use the accelerator badge system
    if (timing === "early") {
      const result = await awardRepeatableBadge(
        ctx.integrations.apps_database,
        camper_id,
        BADGE_IDS.CHECK_IN,
        `Check-in: early (session ${session_id})`,
      );
      points = result.points;
    } else if (timing === "late" && points < 0) {
      // Late penalty: deduct points
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
        [points, camper_id],
        { label: "Deduct late check-in points" }
      );
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason) VALUES ($1, $2, $3)`,
        [camper_id, points, `Check-in: late (${session_id})`],
        { label: "Log late penalty" }
      );
    }

    // Insert check-in response
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_checkin_responses (session_id, camper_id, team_id, timing, word_used, points_awarded)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [session_id, camper_id, teamId, timing, submittedWord, points],
      { label: "Record check-in" }
    );

    // Check if team is now complete
    let teamComplete = false;
    let firstTeam = false;

    if (teamId) {
      const TeamStatusSchema = z.object({ checked_in: z.coerce.number(), total: z.coerce.number() });
      const teamStatus = await ctx.integrations.apps_database.query(
        `SELECT
          (SELECT COUNT(*) FROM camp201_checkin_responses WHERE session_id = $1 AND team_id = $2) as checked_in,
          (SELECT COUNT(*) FROM camp201_campers WHERE team_id = $2 AND role != 'counselor') as total`,
        TeamStatusSchema,
        [session_id, teamId],
        { label: "Check team completion" }
      );

      if (teamStatus.length > 0 && teamStatus[0].checked_in >= teamStatus[0].total && teamStatus[0].total > 0) {
        teamComplete = true;

        // Check if this is the first team to complete
        if (!session.first_team_id) {
          await ctx.integrations.apps_database.execute(
            `UPDATE camp201_checkin_sessions SET first_team_id = $1 WHERE id = $2 AND first_team_id IS NULL`,
            [teamId, session_id],
            { label: "Mark first team" }
          );
          firstTeam = true;

          // Award +5 to TEAM points (not individual members)
          await ctx.integrations.apps_database.execute(
            `UPDATE camp201_teams SET team_points = team_points + 5 WHERE id = $1`,
            [teamId],
            { label: "Award first-team bonus to team_points" }
          );
          await ctx.integrations.apps_database.execute(
            `INSERT INTO camp201_team_points_log (team_id, points, reason)
             VALUES ($1, $2, $3)`,
            [teamId, 5, `First team to check in (session ${session_id})`],
            { label: "Log first-team bonus" }
          );
        }
      }
    }

    // --- Early Bird & Iron Camper badge evaluation ---
    const EARLY_BIRD_BADGE_ID = 5;
    const IRON_CAMPER_BADGE_ID = 6;
    const IRON_CAMPER_POINTS = 15;
    const TRULY_EARLY_MINUTES = 10; // must be 10+ min before timer_ends_at

    // Check if THIS check-in was "truly early" (10+ min before deadline)
    const trulyEarlyThreshold = new Date(timerEndsAt.getTime() - TRULY_EARLY_MINUTES * 60 * 1000);
    const isTrulyEarly = now <= trulyEarlyThreshold;

    if (isTrulyEarly) {
      // Get camper's cohort info for camp length
      const CohortInfoSchema = z.object({
        cohort_id: z.number(),
        start_date: z.string(),
        end_date: z.string(),
      });
      const cohortInfo = await ctx.integrations.apps_database.query(
        `SELECT c.cohort_id, co.start_date::text, co.end_date::text
         FROM camp201_campers c
         JOIN camp201_cohorts co ON co.id = c.cohort_id
         WHERE c.id = $1 LIMIT 1`,
        CohortInfoSchema,
        [camper_id],
        { label: "Get cohort info for badge eval" }
      );

      if (cohortInfo.length > 0) {
        const { cohort_id, start_date, end_date } = cohortInfo[0];
        const campDays = Math.round(
          (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 60 * 60 * 24)
        ) + 1; // inclusive

        // Get all check-in sessions for this cohort, and whether camper was truly early for each
        const HistorySchema = z.object({
          session_id: z.coerce.number(),
          timer_ends_at: z.string(),
          checked_in_at: z.string().nullable(),
        });
        const history = await ctx.integrations.apps_database.query(
          `SELECT cs.id as session_id, cs.timer_ends_at,
                  cr.checked_in_at
           FROM camp201_checkin_sessions cs
           LEFT JOIN camp201_checkin_responses cr
             ON cr.session_id = cs.id AND cr.camper_id = $1
           WHERE cs.cohort_id = $2 AND cs.status IN ('active', 'closed')
           ORDER BY cs.started_at ASC
           LIMIT 50`,
          HistorySchema,
          [camper_id, cohort_id],
          { label: "Get check-in history for badge eval" }
        );

        // Calculate which sessions the camper was truly early for
        const trulyEarlyFlags: boolean[] = history.map((h) => {
          if (!h.checked_in_at) return false;
          const sessionDeadline = new Date(h.timer_ends_at);
          const earlyThreshold = new Date(sessionDeadline.getTime() - TRULY_EARLY_MINUTES * 60 * 1000);
          return new Date(h.checked_in_at) <= earlyThreshold;
        });

        const totalSessions = history.length;

        // --- Early Bird: 3+ consecutive truly-early days, camp must be > 3 days ---
        if (campDays > 3) {
          let maxStreak = 0;
          let currentStreak = 0;
          for (const early of trulyEarlyFlags) {
            if (early) {
              currentStreak++;
              maxStreak = Math.max(maxStreak, currentStreak);
            } else {
              currentStreak = 0;
            }
          }
          if (maxStreak >= 3) {
            await ctx.integrations.apps_database.execute(
              `INSERT INTO camp201_camper_badges (camper_id, badge_id)
               VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [camper_id, EARLY_BIRD_BADGE_ID],
              { label: "Award Early Bird badge" }
            );
          }
        }

        // --- Iron Camper: truly early EVERY session, and all sessions have occurred ---
        // Only award once all camp days have had a check-in session
        const allTrulyEarly = trulyEarlyFlags.length > 0 && trulyEarlyFlags.every(Boolean);
        if (allTrulyEarly && totalSessions >= campDays) {
          // Check if badge already awarded (to avoid duplicate points)
          const ExistingBadge = z.object({ id: z.number() });
          const existingIron = await ctx.integrations.apps_database.query(
            `SELECT id FROM camp201_camper_badges WHERE camper_id = $1 AND badge_id = $2 LIMIT 1`,
            ExistingBadge,
            [camper_id, IRON_CAMPER_BADGE_ID],
            { label: "Check existing Iron Camper badge" }
          );

          if (existingIron.length === 0) {
            await ctx.integrations.apps_database.execute(
              `INSERT INTO camp201_camper_badges (camper_id, badge_id)
               VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [camper_id, IRON_CAMPER_BADGE_ID],
              { label: "Award Iron Camper badge" }
            );
            // Award Iron Camper points
            await ctx.integrations.apps_database.execute(
              `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
              [IRON_CAMPER_POINTS, camper_id],
              { label: "Award Iron Camper points" }
            );
            await ctx.integrations.apps_database.execute(
              `INSERT INTO camp201_points_log (camper_id, points, reason) VALUES ($1, $2, $3)`,
              [camper_id, IRON_CAMPER_POINTS, "Iron Camper — early every day"],
              { label: "Log Iron Camper points" }
            );
          }
        }
      }
    }

    return { success: true, timing, points, error: null, team_complete: teamComplete, first_team: firstTeam };
  },
});
