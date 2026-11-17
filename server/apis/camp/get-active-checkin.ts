import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getCounselorAccess } from "../../lib/cohort.js";
import { COUNTS_FOR_CHECKIN_SQL, EXCUSED_SQL } from "../../lib/checkin-team-race.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetActiveCheckIn",
  description: "Gets the active check-in and team progress; only counselors get the word",
  integrations: {
    camp_201_db: postgres(APPS_DB),
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
    /** The signed-in cAMPer: true only when they still owe a check-in (not in, not excused, counts for check-in). */
    my_needs_checkin: z.boolean(),
    /** my_needs_checkin AND the grace minute is over, by the server clock. Drives the late pop-up. */
    my_is_late: z.boolean(),
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

    const sessions = await ctx.integrations.camp_201_db.query(
      `SELECT id, label, duration_minutes, started_at, timer_ends_at, checkin_opens_at, status
       FROM camp201_checkin_sessions
       WHERE status = 'active'
       ORDER BY started_at DESC LIMIT 1`,
      SessionSchema,
      undefined,
      { label: "Get active check-in session" }
    );

    if (sessions.length === 0) {
      return { active: false, session: null, current_word: null, previous_word: null, checkin_open: false, teams_progress: [], my_needs_checkin: false, my_is_late: false };
    }

    const session = sessions[0];
    const now = new Date();
    const checkinOpensAt = new Date(session.checkin_opens_at);
    const checkinOpen = now >= checkinOpensAt;

    // Get current and previous word using deterministic selection
    let currentWord: string | null = null;
    let previousWord: string | null = null;

    // The trail marker word is shown only on the counselor's big screen. cAMPers must be in the
    // room to read it, so it is never sent to their browsers.
    const { isAdmin } = await getCounselorAccess(ctx.integrations.camp_201_db, ctx.user.email);

    if (checkinOpen && isAdmin) {
      // Calculate which time slot we're in (15-second slots)
      const elapsedSinceOpen = Math.floor((now.getTime() - checkinOpensAt.getTime()) / 1000);
      const currentSlot = Math.floor(elapsedSinceOpen / 15);
      const previousSlot = Math.max(0, currentSlot - 1);

      // Get words deterministically based on session ID + slot
      const WordSchema = z.object({ word: z.string() });
      
      const CountSchema = z.object({ count: z.coerce.number() });
      const countResult = await ctx.integrations.camp_201_db.query(
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

        const currentWords = await ctx.integrations.camp_201_db.query(
          `SELECT word FROM camp201_word_bank ORDER BY id LIMIT 1 OFFSET $1`,
          WordSchema,
          [currentIndex],
          { label: "Get current word" }
        );
        currentWord = currentWords.length > 0 ? currentWords[0].word : null;

        if (currentSlot > 0) {
          const prevWords = await ctx.integrations.camp_201_db.query(
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

    // Same membership rule as the team race: active cAMPers only; excused members count as in.
    const teamsProgress = await ctx.integrations.camp_201_db.query(
      `WITH members AS (
         SELECT c.team_id, c.id,
                (EXISTS (SELECT 1 FROM camp201_checkin_responses r WHERE r.session_id = $1 AND r.camper_id = c.id)
                 OR ${EXCUSED_SQL}) AS is_in,
                (SELECT MAX(r.checked_in_at) FROM camp201_checkin_responses r WHERE r.session_id = $1 AND r.camper_id = c.id) AS at
         FROM camp201_campers c
         WHERE c.team_id IS NOT NULL AND ${COUNTS_FOR_CHECKIN_SQL}
       )
       SELECT t.id AS team_id, t.name AS team_name,
              COUNT(*) FILTER (WHERE m.is_in) AS checked_in,
              COUNT(*) AS total_members,
              (COUNT(*) FILTER (WHERE m.is_in) = COUNT(*)) AS all_in,
              MAX(m.at)::text AS completed_at
       FROM camp201_teams t JOIN members m ON m.team_id = t.id
       GROUP BY t.id, t.name
       ORDER BY (COUNT(*) FILTER (WHERE m.is_in))::float / COUNT(*) DESC, MAX(m.at) ASC NULLS LAST
       LIMIT 20`,
      TeamProgressSchema,
      [session.id],
      { label: "Get team check-in progress" }
    );

    // Does the signed-in cAMPer still owe a check-in? Counselors, removed/excused cAMPers, and anyone
    // already checked in never do.
    const email = (ctx.user.email ?? "").trim().toLowerCase();
    let myNeedsCheckin = false;
    if (email && !isAdmin) {
      const me = await ctx.integrations.camp_201_db.query(
        `SELECT NOT EXISTS (SELECT 1 FROM camp201_checkin_responses r WHERE r.session_id = $1 AND r.camper_id = c.id)
                AND NOT ${EXCUSED_SQL} AS needs
         FROM camp201_campers c
         WHERE lower(c.email) = $2 AND ${COUNTS_FOR_CHECKIN_SQL}
         LIMIT 1`,
        z.object({ needs: z.boolean() }),
        [session.id, email],
        { label: "My check-in status" }
      );
      myNeedsCheckin = me[0]?.needs ?? false;
    }

    return {
      active: true,
      session,
      current_word: currentWord,
      previous_word: previousWord,
      checkin_open: checkinOpen,
      teams_progress: teamsProgress,
      my_needs_checkin: myNeedsCheckin,
      my_is_late: myNeedsCheckin && now.getTime() > new Date(session.timer_ends_at).getTime() + 60_000,
    };
  },
});
