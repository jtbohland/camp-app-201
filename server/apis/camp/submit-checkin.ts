import { api, z, postgres } from "@superblocksteam/sdk-api";
import { isCampClosed } from "../../lib/camp-closed-guard.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

// Flat check-in points (no accelerator)
const EARLY_POINTS = 5;
const ON_TIME_POINTS = 3;
const LATE_POINTS = -2;

// Team race bonuses (flat, to team_points)
const TEAM_RACE_BONUSES = [5, 3, 1]; // 1st, 2nd, 3rd

// Badge IDs
const EARLY_BIRD_BADGE_ID = 5;   // 3 consecutive early check-ins
const IRON_CAMPER_BADGE_ID = 6;  // Early every session of camp
const IRON_CAMPER_POINTS = 15;

export default api({
  name: "SubmitCheckIn",
  description: "Camper submits check-in with word + PIN. Flat points: early +5, on-time +3, late -2",
  integrations: {
    camp_201_db: postgres(APPS_DB),
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
    team_place: z.number().nullable(), // 1st, 2nd, 3rd, or null
  }),
  async run(ctx, input) {
    if (await isCampClosed(ctx.integrations.camp_201_db)) {
      return { success: false, timing: null, points: 0, error: "cAMP is closed — no more check-ins accepted.", team_complete: false, team_place: null };
    }
    const { camper_id, session_id, word, pin } = input;

    // ─── Verify PIN ───
    const CamperSchema = z.object({ pin: z.string().nullable(), team_id: z.number().nullable() });
    const campers = await ctx.integrations.camp_201_db.query(
      `SELECT pin, team_id FROM camp201_campers WHERE id = $1 LIMIT 1`,
      CamperSchema,
      [camper_id],
      { label: "Verify camper PIN" }
    );

    if (campers.length === 0) {
      return { success: false, timing: null, points: 0, error: "Camper not found", team_complete: false, team_place: null };
    }

    if (!campers[0].pin || campers[0].pin !== pin) {
      return { success: false, timing: null, points: 0, error: "Invalid PIN", team_complete: false, team_place: null };
    }

    const teamId = campers[0].team_id;

    // ─── Check duplicate ───
    const ExistingSchema = z.object({ id: z.number() });
    const existing = await ctx.integrations.camp_201_db.query(
      `SELECT id FROM camp201_checkin_responses WHERE session_id = $1 AND camper_id = $2 LIMIT 1`,
      ExistingSchema,
      [session_id, camper_id],
      { label: "Check duplicate check-in" }
    );

    if (existing.length > 0) {
      return { success: false, timing: null, points: 0, error: "Already checked in", team_complete: false, team_place: null };
    }

    // ─── Get session ───
    const SessionSchema = z.object({
      timer_ends_at: z.string(),
      checkin_opens_at: z.string(),
      status: z.string(),
      teams_finished: z.coerce.number(),
    });
    const sessions = await ctx.integrations.camp_201_db.query(
      `SELECT timer_ends_at, checkin_opens_at, status, COALESCE(teams_finished, 0) as teams_finished
       FROM camp201_checkin_sessions WHERE id = $1 LIMIT 1`,
      SessionSchema,
      [session_id],
      { label: "Get session" }
    );

    if (sessions.length === 0 || sessions[0].status !== 'active') {
      return { success: false, timing: null, points: 0, error: "Check-in session not active", team_complete: false, team_place: null };
    }

    const session = sessions[0];
    const now = new Date();
    const checkinOpensAt = new Date(session.checkin_opens_at);
    const timerEndsAt = new Date(session.timer_ends_at);

    if (now < checkinOpensAt) {
      return { success: false, timing: null, points: 0, error: "Check-in not open yet", team_complete: false, team_place: null };
    }

    // ─── Validate word (current + previous accepted) ───
    const elapsedSinceOpen = Math.floor((now.getTime() - checkinOpensAt.getTime()) / 1000);
    const currentSlot = Math.floor(elapsedSinceOpen / 15);
    const previousSlot = Math.max(0, currentSlot - 1);

    const CountSchema = z.object({ count: z.coerce.number() });
    const countResult = await ctx.integrations.camp_201_db.query(
      `SELECT COUNT(*) as count FROM camp201_word_bank`,
      CountSchema,
      undefined,
      { label: "Count words" }
    );
    const totalWords = countResult[0].count;

    const WordSchema = z.object({ word: z.string() });
    const currentIndex = ((session_id * 7919) + (currentSlot * 104729)) % totalWords;
    const previousIndex = ((session_id * 7919) + (previousSlot * 104729)) % totalWords;

    const currentWords = await ctx.integrations.camp_201_db.query(
      `SELECT word FROM camp201_word_bank ORDER BY id LIMIT 1 OFFSET $1`,
      WordSchema,
      [currentIndex],
      { label: "Get current word" }
    );

    let validWords: string[] = [];
    if (currentWords.length > 0) validWords.push(currentWords[0].word.toUpperCase());

    if (currentSlot > 0) {
      const prevWords = await ctx.integrations.camp_201_db.query(
        `SELECT word FROM camp201_word_bank ORDER BY id LIMIT 1 OFFSET $1`,
        WordSchema,
        [previousIndex],
        { label: "Get previous word" }
      );
      if (prevWords.length > 0) validWords.push(prevWords[0].word.toUpperCase());
    }

    const submittedWord = word.toUpperCase().trim();
    if (!validWords.includes(submittedWord)) {
      return { success: false, timing: null, points: 0, error: "Incorrect word — check the screen and try again", team_complete: false, team_place: null };
    }

    // ─── Determine timing: early / on_time / late ───
    // Grace = 60 seconds after timer ends
    const graceEnd = new Date(timerEndsAt.getTime() + 60 * 1000);
    let timing: string;
    let points: number;

    if (now <= timerEndsAt) {
      timing = "early";
      points = EARLY_POINTS;
    } else if (now <= graceEnd) {
      timing = "on_time";
      points = ON_TIME_POINTS;
    } else {
      timing = "late";
      points = LATE_POINTS;
    }

    // ─── Award/deduct individual points ───
    await ctx.integrations.camp_201_db.execute(
      `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
      [points, camper_id],
      { label: `Award check-in points (${timing}: ${points})` }
    );
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason) VALUES ($1, $2, $3)`,
      [camper_id, points, `Check-in: ${timing} (session ${session_id})`],
      { label: "Log check-in points" }
    );

    // ─── Award Check-In badge for early check-ins (no accelerator, just badge count) ───
    if (timing === "early") {
      await ctx.integrations.camp_201_db.execute(
        `INSERT INTO camp201_camper_badges (camper_id, badge_id, awarded_at, earn_count)
         VALUES ($1, 133, NOW(), 1)
         ON CONFLICT (camper_id, badge_id) DO UPDATE SET earn_count = camp201_camper_badges.earn_count + 1`,
        [camper_id],
        { label: "Increment Check-In badge count" }
      );
    }

    // ─── Insert check-in response ───
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_checkin_responses (session_id, camper_id, team_id, timing, word_used, points_awarded)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [session_id, camper_id, teamId, timing, submittedWord, points],
      { label: "Record check-in" }
    );

    // ─── Team race: check if team is complete, award 1st/2nd/3rd ───
    let teamComplete = false;
    let teamPlace: number | null = null;

    if (teamId) {
      const TeamStatusSchema = z.object({ checked_in: z.coerce.number(), total: z.coerce.number(), absent_approved: z.coerce.number() });
      const teamStatus = await ctx.integrations.camp_201_db.query(
        `SELECT
          (SELECT COUNT(*) FROM camp201_checkin_responses WHERE session_id = $1 AND team_id = $2) as checked_in,
          (SELECT COUNT(*) FROM camp201_campers WHERE team_id = $2 AND role != 'counselor') as total,
          (SELECT COUNT(DISTINCT ar.camper_id)
           FROM camp201_absence_requests ar
           JOIN camp201_campers c2 ON c2.id = ar.camper_id
           WHERE c2.team_id = $2
             AND ar.status = 'approved'
             AND ar.start_time <= NOW()
             AND ar.end_time >= NOW()
          ) as absent_approved`,
        TeamStatusSchema,
        [session_id, teamId],
        { label: "Check team completion" }
      );

      const effectiveTotal = teamStatus[0].total - teamStatus[0].absent_approved;
      if (teamStatus.length > 0 && teamStatus[0].checked_in >= effectiveTotal && effectiveTotal > 0) {
        teamComplete = true;

        // Atomically increment teams_finished counter and get the new value
        const PlaceSchema = z.object({ teams_finished: z.coerce.number() });
        const placeResult = await ctx.integrations.camp_201_db.query(
          `UPDATE camp201_checkin_sessions
           SET teams_finished = COALESCE(teams_finished, 0) + 1
           WHERE id = $1
           RETURNING teams_finished`,
          PlaceSchema,
          [session_id],
          { label: "Increment teams_finished" }
        );

        const place = placeResult[0]?.teams_finished ?? 0;
        teamPlace = place;

        // Award team race bonus (1st=+5, 2nd=+3, 3rd=+1, 4th+=0)
        const bonus = place <= TEAM_RACE_BONUSES.length ? TEAM_RACE_BONUSES[place - 1] : 0;
        if (bonus > 0) {
          await ctx.integrations.camp_201_db.execute(
            `UPDATE camp201_teams SET team_points = team_points + $1 WHERE id = $2`,
            [bonus, teamId],
            { label: `Award team race bonus (place ${place}: +${bonus})` }
          );
          await ctx.integrations.camp_201_db.execute(
            `INSERT INTO camp201_team_points_log (team_id, points, reason)
             VALUES ($1, $2, $3)`,
            [teamId, bonus, `Check-in race: ${place === 1 ? '1st' : place === 2 ? '2nd' : '3rd'} team (session ${session_id})`],
            { label: "Log team race bonus" }
          );
        }

        // Auto-check-in absent members (0 pts, timing='absent')
        const AbsentSchema = z.object({ id: z.number() });
        const absentMembers = await ctx.integrations.camp_201_db.query(
          `SELECT DISTINCT c.id
           FROM camp201_campers c
           JOIN camp201_absence_requests ar ON ar.camper_id = c.id
           WHERE c.team_id = $1
             AND c.role != 'counselor'
             AND ar.status = 'approved'
             AND ar.start_time <= NOW()
             AND ar.end_time >= NOW()
             AND c.id NOT IN (SELECT camper_id FROM camp201_checkin_responses WHERE session_id = $2)
           LIMIT 10`,
          AbsentSchema,
          [teamId, session_id],
          { label: "Find absent team members" }
        );

        for (const absent of absentMembers) {
          await ctx.integrations.camp_201_db.execute(
            `INSERT INTO camp201_checkin_responses (session_id, camper_id, team_id, timing, word_used, points_awarded)
             VALUES ($1, $2, $3, 'absent', 'ABSENT', 0)
             ON CONFLICT DO NOTHING`,
            [session_id, absent.id, teamId],
            { label: `Auto-check-in absent member ${absent.id}` }
          );
        }
      }
    }

    // ─── Early Bird & Iron Camper badge evaluation ───
    if (timing === "early") {
      const CohortInfoSchema = z.object({
        cohort_id: z.number(),
        start_date: z.string(),
        end_date: z.string(),
      });
      const cohortInfo = await ctx.integrations.camp_201_db.query(
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
        ) + 1;

        // Get check-in history — was camper early (before timer) for each session?
        const HistorySchema = z.object({
          session_id: z.coerce.number(),
          timing: z.string().nullable(),
        });
        const history = await ctx.integrations.camp_201_db.query(
          `SELECT cs.id as session_id, cr.timing
           FROM camp201_checkin_sessions cs
           LEFT JOIN camp201_checkin_responses cr
             ON cr.session_id = cs.id AND cr.camper_id = $1
           WHERE cs.cohort_id = $2 AND cs.status IN ('active', 'closed')
           ORDER BY cs.started_at ASC
           LIMIT 50`,
          HistorySchema,
          [camper_id, cohort_id],
          { label: "Get check-in history for badges" }
        );

        const earlyFlags = history.map((h) => h.timing === "early");
        const totalSessions = history.length;

        // Early Bird: 3+ consecutive early check-ins (camp must be > 3 days)
        if (campDays > 3) {
          let maxStreak = 0;
          let currentStreak = 0;
          for (const early of earlyFlags) {
            if (early) { currentStreak++; maxStreak = Math.max(maxStreak, currentStreak); }
            else { currentStreak = 0; }
          }
          if (maxStreak >= 3) {
            await ctx.integrations.camp_201_db.execute(
              `INSERT INTO camp201_camper_badges (camper_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [camper_id, EARLY_BIRD_BADGE_ID],
              { label: "Award Early Bird" }
            );
          }
        }

        // Iron Camper: early EVERY session, and all camp days have had sessions
        const allEarly = earlyFlags.length > 0 && earlyFlags.every(Boolean);
        if (allEarly && totalSessions >= campDays) {
          const ExistingBadge = z.object({ id: z.number() });
          const existingIron = await ctx.integrations.camp_201_db.query(
            `SELECT id FROM camp201_camper_badges WHERE camper_id = $1 AND badge_id = $2 LIMIT 1`,
            ExistingBadge,
            [camper_id, IRON_CAMPER_BADGE_ID],
            { label: "Check existing Iron Camper" }
          );

          if (existingIron.length === 0) {
            await ctx.integrations.camp_201_db.execute(
              `INSERT INTO camp201_camper_badges (camper_id, badge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
              [camper_id, IRON_CAMPER_BADGE_ID],
              { label: "Award Iron Camper" }
            );
            await ctx.integrations.camp_201_db.execute(
              `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
              [IRON_CAMPER_POINTS, camper_id],
              { label: "Award Iron Camper points" }
            );
            await ctx.integrations.camp_201_db.execute(
              `INSERT INTO camp201_points_log (camper_id, points, reason) VALUES ($1, $2, $3)`,
              [camper_id, IRON_CAMPER_POINTS, "Iron Camper — early every session"],
              { label: "Log Iron Camper points" }
            );
          }
        }
      }
    }

    return { success: true, timing, points, error: null, team_complete: teamComplete, team_place: teamPlace };
  },
});
