import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const AgendaSessionSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  session_type: z.string(),
  start_time: z.string(),
  end_time: z.string(),
});

export default api({
  name: "GetDailySurvey",
  description: "Gets the dynamic survey for a given day, built from agenda sessions",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    day_number: z.number(),
  }),
  output: z.object({
    sessions: z.array(z.object({
      id: z.number(),
      title: z.string(),
      session_type: z.string(),
      start_time: z.string(),
      end_time: z.string(),
    })),
    already_submitted: z.boolean(),
    num_days: z.number(),
    is_final_day: z.boolean(),
    deadline_passed: z.boolean(),
    open_questions: z.array(z.object({
      key: z.string(),
      label: z.string(),
      required: z.boolean(),
    })),
    overall_aspects: z.array(z.object({
      key: z.string(),
      label: z.string(),
    })),
    overall_open_questions: z.array(z.object({
      key: z.string(),
      label: z.string(),
      required: z.boolean(),
    })),
  }),
  async run(ctx, input) {
    // Get num_days from config
    const ConfigSchema = z.object({ value: z.string() });
    const configRows = await ctx.integrations.apps_database.query(
      `SELECT value FROM camp201_config WHERE key = 'num_days' LIMIT 1`,
      ConfigSchema,
      undefined,
      { label: "Get num_days config" }
    );
    const numDays = configRows.length > 0 ? parseInt(configRows[0].value, 10) : 4;
    const isFinalDay = input.day_number === numDays;

    // Get sessions for this day (exclude lunch and breaks)
    const sessions = await ctx.integrations.apps_database.query(
      `SELECT id, title, session_type, start_time, end_time
       FROM camp201_agenda
       WHERE day_number = $1
         AND session_type NOT IN ('lunch', 'break')
       ORDER BY start_time
       LIMIT 30`,
      AgendaSessionSchema,
      [input.day_number],
      { label: "Get agenda sessions for day" }
    );

    // Check if already submitted
    const SubCheckSchema = z.object({ id: z.coerce.number() });
    const existing = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_daily_survey_submissions
       WHERE camper_id = $1 AND day_number = $2
         AND cohort_id = (SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1)
       LIMIT 1`,
      SubCheckSchema,
      [input.camper_id, input.day_number],
      { label: "Check if already submitted" }
    );

    // Check deadline: 9am PT the next day
    // We'll compute this based on camp_start_date + day_number
    const startDateRows = await ctx.integrations.apps_database.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_start_date' LIMIT 1`,
      ConfigSchema,
      undefined,
      { label: "Get camp start date" }
    );
    let deadlinePassed = false;
    if (startDateRows.length > 0) {
      const startDate = new Date(startDateRows[0].value + "T00:00:00-07:00"); // PT
      const deadlineDate = new Date(startDate);
      deadlineDate.setDate(deadlineDate.getDate() + input.day_number); // next day
      deadlineDate.setHours(9, 0, 0, 0); // 9am PT
      deadlinePassed = new Date() > deadlineDate;
    }

    // Daily open-ended questions
    const openQuestions = [
      { key: "highlight", label: "What was your highlight today?", required: false },
      { key: "improve", label: "What's one thing we could improve for tomorrow?", required: false },
      { key: "anything_else", label: "Anything else on your mind?", required: false },
    ];

    // Final day overall aspects (1-5 scale)
    const overallAspects = isFinalDay ? [
      { key: "in_person_value", label: "Value of the in-person capstone experience" },
      { key: "team_collab", label: "Working together with your team" },
      { key: "guest_speakers", label: "The guest speakers" },
      { key: "info_activity_balance", label: "The balance of information vs. activity" },
      { key: "onboarding_placement", label: "Placement of cAMP 201 in your onboarding journey" },
      { key: "facilitators", label: "cAMP 201 enablement facilitators" },
      { key: "being_in_hq", label: "Being in HQ (the office)" },
    ] : [];

    // Final day overall open-ended
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
      deadline_passed: deadlinePassed,
      open_questions: openQuestions,
      overall_aspects: overallAspects,
      overall_open_questions: overallOpenQuestions,
    };
  },
});
