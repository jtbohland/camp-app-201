import { api, z, postgres } from "@superblocksteam/sdk-api";

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
      points = 5;
    } else if (now <= graceEnd) {
      timing = "on_time";
      points = 3;
    } else {
      timing = "late";
      points = -2;
    }

    // Insert check-in response
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_checkin_responses (session_id, camper_id, team_id, timing, word_used, points_awarded)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [session_id, camper_id, teamId, timing, submittedWord, points],
      { label: "Record check-in" }
    );

    // Award points to camper
    await ctx.integrations.apps_database.execute(
      `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
      [points, camper_id],
      { label: "Award check-in points" }
    );

    // Log points
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_points_log (camper_id, points, reason) VALUES ($1, $2, $3)`,
      [camper_id, points, `Check-in: ${timing} (${session_id})`],
      { label: "Log check-in points" }
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

          // Award +5 bonus to all team members who checked in
          await ctx.integrations.apps_database.execute(
            `UPDATE camp201_campers SET points = points + 5
             WHERE id IN (SELECT camper_id FROM camp201_checkin_responses WHERE session_id = $1 AND team_id = $2)`,
            [session_id, teamId],
            { label: "Award first-team bonus" }
          );
        }
      }
    }

    return { success: true, timing, points, error: null, team_complete: teamComplete, first_team: firstTeam };
  },
});
