import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "GetActiveCheckIn",
  description: "Gets the active check-in session with current word and team progress",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    active: z.boolean(),
    session: z.object({
      id: z.number(),
      label: z.string(),
      duration_minutes: z.number(),
      started_at: z.string(),
      timer_ends_at: z.string(),
      checkin_opens_at: z.string(),
      status: z.string(),
    }).nullable(),
    current_word: z.string().nullable(),
    previous_word: z.string().nullable(),
    checkin_open: z.boolean(),
    teams_progress: z.array(z.object({
      team_id: z.number(),
      team_name: z.string(),
      checked_in: z.number(),
      total_members: z.number(),
      all_in: z.boolean(),
      completed_at: z.string().nullable(),
    })),
  }),
  async run(ctx) {
    // Get active session
    const SessionSchema = z.object({
      id: z.number(),
      label: z.string(),
      duration_minutes: z.number(),
      started_at: z.string(),
      timer_ends_at: z.string(),
      checkin_opens_at: z.string(),
      status: z.string(),
    });

    const sessions = await ctx.integrations.apps_database.query(
      `SELECT id, label, duration_minutes, started_at, timer_ends_at, checkin_opens_at, status
       FROM camp201_checkin_sessions
       WHERE status = 'active'
       ORDER BY started_at DESC LIMIT 1`,
      SessionSchema,
      undefined,
      { label: "Get active check-in session" }
    );

    if (sessions.length === 0) {
      return { active: false, session: null, current_word: null, previous_word: null, checkin_open: false, teams_progress: [] };
    }

    const session = sessions[0];
    const now = new Date();
    const checkinOpensAt = new Date(session.checkin_opens_at);
    const checkinOpen = now >= checkinOpensAt;

    // Get current and previous word using deterministic selection
    let currentWord: string | null = null;
    let previousWord: string | null = null;

    if (checkinOpen) {
      // Calculate which time slot we're in (15-second slots)
      const elapsedSinceOpen = Math.floor((now.getTime() - checkinOpensAt.getTime()) / 1000);
      const currentSlot = Math.floor(elapsedSinceOpen / 15);
      const previousSlot = Math.max(0, currentSlot - 1);

      // Get words deterministically based on session ID + slot
      const WordSchema = z.object({ word: z.string() });
      
      const CountSchema = z.object({ count: z.coerce.number() });
      const countResult = await ctx.integrations.apps_database.query(
        `SELECT COUNT(*) as count FROM camp201_word_bank`,
        CountSchema,
        undefined,
        { label: "Count word bank" }
      );
      const totalWords = countResult[0].count;

      if (totalWords > 0) {
        // Use session_id + slot to pick word deterministically
        const currentIndex = ((session.id * 7919) + (currentSlot * 104729)) % totalWords;
        const previousIndex = ((session.id * 7919) + (previousSlot * 104729)) % totalWords;

        const currentWords = await ctx.integrations.apps_database.query(
          `SELECT word FROM camp201_word_bank ORDER BY id LIMIT 1 OFFSET $1`,
          WordSchema,
          [currentIndex],
          { label: "Get current word" }
        );
        currentWord = currentWords.length > 0 ? currentWords[0].word : null;

        if (currentSlot > 0) {
          const prevWords = await ctx.integrations.apps_database.query(
            `SELECT word FROM camp201_word_bank ORDER BY id LIMIT 1 OFFSET $1`,
            WordSchema,
            [previousIndex],
            { label: "Get previous word" }
          );
          previousWord = prevWords.length > 0 ? prevWords[0].word : null;
        }
      }
    }

    // Get team progress
    const TeamProgressSchema = z.object({
      team_id: z.number(),
      team_name: z.string(),
      checked_in: z.coerce.number(),
      total_members: z.coerce.number(),
      all_in: z.boolean(),
      completed_at: z.string().nullable(),
    });

    const teamsProgress = await ctx.integrations.apps_database.query(
      `SELECT
        t.id as team_id,
        t.name as team_name,
        COALESCE(cr.checked_in_count, 0) as checked_in,
        COALESCE(tm.total_members, 0) as total_members,
        CASE WHEN COALESCE(cr.checked_in_count, 0) >= COALESCE(tm.total_members, 0) AND COALESCE(tm.total_members, 0) > 0 THEN true ELSE false END as all_in,
        cr.latest_checkin as completed_at
      FROM camp201_teams t
      LEFT JOIN (
        SELECT team_id, COUNT(*) as total_members
        FROM camp201_campers
        WHERE team_id IS NOT NULL AND role != 'counselor'
        GROUP BY team_id
      ) tm ON tm.team_id = t.id
      LEFT JOIN (
        SELECT r.team_id, COUNT(*) as checked_in_count, MAX(r.checked_in_at)::text as latest_checkin
        FROM camp201_checkin_responses r
        WHERE r.session_id = $1
        GROUP BY r.team_id
      ) cr ON cr.team_id = t.id
      WHERE COALESCE(tm.total_members, 0) > 0
      ORDER BY COALESCE(cr.checked_in_count, 0)::float / GREATEST(COALESCE(tm.total_members, 1), 1) DESC, cr.latest_checkin ASC
      LIMIT 20`,
      TeamProgressSchema,
      [session.id],
      { label: "Get team check-in progress" }
    );

    return {
      active: true,
      session,
      current_word: currentWord,
      previous_word: previousWord,
      checkin_open: checkinOpen,
      teams_progress: teamsProgress,
    };
  },
});
