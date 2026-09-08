import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateDailySurveys",
  description: "Creates new daily survey tables for the revamped survey system",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Daily survey submissions — one row per camper per day
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_daily_survey_submissions (
        id SERIAL PRIMARY KEY,
        camper_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        day_number INTEGER NOT NULL,
        cohort_id INTEGER REFERENCES camp201_cohorts(id),
        points_awarded INTEGER DEFAULT 0,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(camper_id, day_number, cohort_id)
      )`,
      undefined,
      { label: "Create daily_survey_submissions table" }
    );

    // Per-session ratings: session_rating + usefulness (the 2 emoji scores)
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_session_ratings (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL REFERENCES camp201_daily_survey_submissions(id),
        agenda_item_id INTEGER NOT NULL,
        session_title TEXT NOT NULL,
        session_type TEXT NOT NULL DEFAULT 'session',
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        usefulness INTEGER NOT NULL CHECK (usefulness BETWEEN 1 AND 5),
        comment TEXT DEFAULT ''
      )`,
      undefined,
      { label: "Create session_ratings table" }
    );

    // Open-ended responses (daily)
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_survey_open_responses (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL REFERENCES camp201_daily_survey_submissions(id),
        question_key TEXT NOT NULL,
        response TEXT NOT NULL DEFAULT ''
      )`,
      undefined,
      { label: "Create survey_open_responses table" }
    );

    // Overall program ratings (final day only)
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_survey_overall_ratings (
        id SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL REFERENCES camp201_daily_survey_submissions(id),
        aspect_key TEXT NOT NULL,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5)
      )`,
      undefined,
      { label: "Create survey_overall_ratings table" }
    );

    return { success: true, message: "Daily survey tables created" };
  },
});
