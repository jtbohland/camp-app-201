import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const AgendaSessionSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  session_type: z.string(),
  start_time: z.string(),
  end_time: z.string(),
});

const DayStatusSchema = z.object({
  day_number: z.coerce.number(),
  submitted: z.boolean(),
});

const TeamProgressSchema = z.object({
  team_id: z.coerce.number(),
  team_name: z.string(),
  team_color: z.string().nullable(),
  total_members: z.coerce.number(),
  submitted_count: z.coerce.number(),
});

export default api({
  name: "GetDailySurvey",
  description: "Gets the dynamic survey for a given day with team race and deadline data",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    day_number: z.number(),
  }),
  output: z.object({
    sessions: z.array(z.object({
      id: z.number(), title: z.string(), session_type: z.string(),
      start_time: z.string(), end_time: z.string(),
    })),
    already_submitted: z.boolean(),
    num_days: z.number(),
    is_final_day: z.boolean(),
    locked: z.boolean(),
    manually_locked: z.boolean(),
    deadline_iso: z.string().nullable(),
    grace_deadline_iso: z.string().nullable(),
    day_statuses: z.array(z.object({ day_number: z.number(), submitted: z.boolean(), locked: z.boolean() })),
    team_progress: z.array(z.object({
      team_id: z.number(), team_name: z.string(), team_color: z.string().nullable(),
      total_members: z.number(), submitted_count: z.number(),
    })),
    open_questions: z.array(z.object({ key: z.string(), label: z.string(), required: z.boolean() })),
    overall_aspects: z.array(z.object({ key: z.string(), label: z.string() })),
    overall_open_questions: z.array(z.object({ key: z.string(), label: z.string(), required: z.boolean() })),
  }),
  async run(ctx, input) {
    const ConfigSchema = z.object({ value: z.string() });
    const cohortFilter = `(SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1)`;

    // Get num_days
    const configRows = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'num_days' LIMIT 1`,
      ConfigSchema, undefined, { label: "Get num_days" }
    );
    const numDays = configRows.length > 0 ? parseInt(configRows[0].value, 10) : 4;
    const isFinalDay = input.day_number === numDays;

    // Get sessions for this day (exclude non-learning sessions)
    const sessions = await ctx.integrations.camp_201_db.query(
      `SELECT id, title, session_type, start_time, end_time
       FROM camp201_agenda WHERE day_number = $1 AND session_type NOT IN ('lunch','break','core')
       ORDER BY start_time LIMIT 30`,
      AgendaSessionSchema, [input.day_number], { label: "Get day sessions" }
    );

    // Check if already submitted
    const existing = await ctx.integrations.camp_201_db.query(
      `SELECT id FROM camp201_daily_survey_submissions
       WHERE camper_id = $1 AND day_number = $2 AND cohort_id = ${cohortFilter} LIMIT 1`,
      z.object({ id: z.coerce.number() }), [input.camper_id, input.day_number],
      { label: "Check submission" }
    );

    // Compute deadlines based on camp_start_date
    const startDateRows = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_start_date' LIMIT 1`,
      ConfigSchema, undefined, { label: "Get camp start date" }
    );

    let deadlineIso: string | null = null;
    let graceDeadlineIso: string | null = null;
    let locked = false;

    // Check manual per-day lock
    const LockSchema = z.object({ value: z.string() });
    const manualLock = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = $1 LIMIT 1`,
      LockSchema,
      [`survey_day_${input.day_number}_locked`],
      { label: "Check manual day lock" }
    );
    const manuallyLocked = manualLock.length > 0 && manualLock[0].value === "true";

    if (startDateRows.length > 0 && startDateRows[0].value) {
      const startDate = new Date(startDateRows[0].value + "T00:00:00-07:00");
      // Deadline: 9am PT the day after this day_number
      const deadline = new Date(startDate);
      deadline.setDate(deadline.getDate() + input.day_number);
      deadline.setHours(9, 0, 0, 0);
      deadlineIso = deadline.toISOString();

      // Grace deadline removed — auto-lock at 9am sharp, no buffer
      graceDeadlineIso = deadlineIso;

      // Auto-lock at 9am PT OR manually locked by counselor (whichever first)
      locked = new Date() > deadline || manuallyLocked;
    }

    // Get day statuses (which days has this camper submitted)
    const dayStatuses = await ctx.integrations.camp_201_db.query(
      `SELECT day_number, true as submitted
       FROM camp201_daily_survey_submissions
       WHERE camper_id = $1 AND cohort_id = ${cohortFilter}
       ORDER BY day_number LIMIT 10`,
      DayStatusSchema, [input.camper_id], { label: "Get day statuses" }
    );
    // Fill in missing days
    const statusMap = new Map(dayStatuses.map(d => [d.day_number, true]));

    // Get all per-day lock statuses
    const DayLockSchema = z.object({ key: z.string(), value: z.string() });
    const dayLocks = await ctx.integrations.camp_201_db.query(
      `SELECT key, value FROM camp201_config WHERE key LIKE 'survey_day_%_locked' LIMIT 10`,
      DayLockSchema, [],
      { label: "Get all day lock statuses" }
    );
    const lockMap = new Map<number, boolean>();
    for (const dl of dayLocks) {
      const match = dl.key.match(/survey_day_(\d+)_locked/);
      if (match) lockMap.set(parseInt(match[1]), dl.value === "true");
    }

    const allDayStatuses = Array.from({ length: numDays }, (_, i) => ({
      day_number: i + 1,
      submitted: statusMap.get(i + 1) ?? false,
      locked: lockMap.get(i + 1) ?? false,
    }));

    // Team race progress for this day
    const teamProgress = await ctx.integrations.camp_201_db.query(
      `SELECT t.id as team_id, t.name as team_name, t.color as team_color,
              COUNT(DISTINCT c.id)::integer as total_members,
              COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN c.id END)::integer as submitted_count
       FROM camp201_teams t
       JOIN camp201_campers c ON c.team_id = t.id AND c.cohort_id = ${cohortFilter}
         AND c.role NOT IN ('counselor','admin')
       LEFT JOIN camp201_daily_survey_submissions s ON s.camper_id = c.id AND s.day_number = $1
         AND s.cohort_id = ${cohortFilter}
       WHERE t.cohort_id = ${cohortFilter}
       GROUP BY t.id, t.name, t.color
       ORDER BY submitted_count DESC, t.name
       LIMIT 10`,
      TeamProgressSchema, [input.day_number], { label: "Team race progress" }
    );

    // Question definitions
    const openQuestions = [
      { key: "highlight", label: "What was your highlight today?", required: false },
      { key: "improve", label: "What's one thing we could improve for tomorrow?", required: false },
      { key: "anything_else", label: "Anything else on your mind?", required: false },
    ];

    const overallAspects = isFinalDay ? [
      { key: "in_person_value", label: "Value of the in-person capstone experience" },
      { key: "team_collab", label: "Working together with your team" },
      { key: "guest_speakers", label: "The guest speakers" },
      { key: "info_activity_balance", label: "The balance of information vs. activity" },
      { key: "onboarding_placement", label: "Placement of cAMP 201 in your onboarding journey" },
      { key: "facilitators", label: "cAMP 201 enablement facilitators" },
      { key: "being_in_hq", label: "Being in HQ (the office)" },
    ] : [];

    const overallOpenQuestions = isFinalDay ? [
      { key: "remove_session", label: "If you had to choose, which session would you remove from cAMP 201?", required: false },
      { key: "add_session", label: "If you could add any session not in the curriculum, what would you add?", required: false },
      { key: "most_valuable", label: "What was the most valuable part of cAMP 201?", required: true },
      { key: "overall_thoughts", label: "What are your overall thoughts on the cAMP 201 experience?", required: false },
    ] : [];

    return {
      sessions: sessions.map(s => ({ id: s.id, title: s.title, session_type: s.session_type, start_time: s.start_time, end_time: s.end_time })),
      already_submitted: existing.length > 0,
      num_days: numDays,
      is_final_day: isFinalDay,
      locked,
      manually_locked: manuallyLocked,
      deadline_iso: deadlineIso,
      grace_deadline_iso: graceDeadlineIso,
      day_statuses: allDayStatuses,
      team_progress: teamProgress.map(t => ({ team_id: t.team_id, team_name: t.team_name, team_color: t.team_color, total_members: t.total_members, submitted_count: t.submitted_count })),
      open_questions: openQuestions,
      overall_aspects: overallAspects,
      overall_open_questions: overallOpenQuestions,
    };
  },
});
