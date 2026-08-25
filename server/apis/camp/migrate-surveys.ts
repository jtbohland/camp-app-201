import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateSurveys",
  description: "Creates survey tables for end-of-day surveys",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Surveys table - admin creates surveys per day
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_surveys (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        questions JSONB NOT NULL DEFAULT '[]',
        day_number INT NOT NULL DEFAULT 1,
        is_active BOOLEAN DEFAULT false,
        points_per_completion INT NOT NULL DEFAULT 3,
        team_bonus_points INT NOT NULL DEFAULT 5,
        cohort_id INT REFERENCES camp201_cohorts(id),
        created_by INT REFERENCES camp201_campers(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        closed_at TIMESTAMPTZ
      )`,
      undefined,
      { label: "Create surveys table" }
    );

    // Survey responses - one per camper per survey
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_survey_responses (
        id SERIAL PRIMARY KEY,
        survey_id INT NOT NULL REFERENCES camp201_surveys(id),
        camper_id INT NOT NULL REFERENCES camp201_campers(id),
        answers JSONB NOT NULL DEFAULT '{}',
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(survey_id, camper_id)
      )`,
      undefined,
      { label: "Create survey_responses table" }
    );

    return { success: true, message: "Survey tables created." };
  },
});
