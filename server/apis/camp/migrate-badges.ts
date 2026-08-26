import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateBadges",
  description: "Creates badges and camper_badges tables for the achievement system",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Badge definitions
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_badges (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        description TEXT NOT NULL,
        icon TEXT NOT NULL DEFAULT 'award',
        color TEXT NOT NULL DEFAULT 'amber',
        category TEXT NOT NULL DEFAULT 'general',
        requirement_type TEXT NOT NULL DEFAULT 'manual',
        requirement_value INTEGER DEFAULT 0,
        points_reward INTEGER NOT NULL DEFAULT 0,
        cohort_id INTEGER REFERENCES camp201_cohorts(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create badges table" }
    );

    // Earned badges junction
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_camper_badges (
        id SERIAL PRIMARY KEY,
        camper_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        badge_id INTEGER NOT NULL REFERENCES camp201_badges(id),
        awarded_at TIMESTAMPTZ DEFAULT NOW(),
        awarded_by INTEGER REFERENCES camp201_campers(id),
        UNIQUE(camper_id, badge_id)
      )`,
      undefined,
      { label: "Create camper_badges table" }
    );

    // Seed default badges
    await ctx.integrations.apps_database.execute(
      `INSERT INTO camp201_badges (name, description, icon, color, category, requirement_type, requirement_value, points_reward) VALUES
        ('Trailblazer', 'Complete all prework items before Day 1', 'compass', 'green', 'preparation', 'prework_complete', 100, 10),
        ('Summit Seeker', 'Earn 100+ total points', 'mountain', 'amber', 'points', 'points_threshold', 100, 5),
        ('Peak Performer', 'Earn 250+ total points', 'trophy', 'yellow', 'points', 'points_threshold', 250, 10),
        ('Legend of the Lake', 'Earn 500+ total points', 'crown', 'purple', 'points', 'points_threshold', 500, 20),
        ('Early Bird', 'Check in first 3 days in a row', 'sunrise', 'orange', 'attendance', 'checkin_streak', 3, 5),
        ('Iron Camper', 'Perfect attendance — check in every day', 'shield', 'red', 'attendance', 'checkin_streak', 5, 15),
        ('Team Player', 'Contribute 5+ items to the Team Hub', 'users', 'blue', 'collaboration', 'hub_contributions', 5, 5),
        ('Campfire Storyteller', 'Complete 5 end-of-day surveys', 'flame', 'orange', 'engagement', 'surveys_completed', 5, 10),
        ('Pathfinder', 'Submit peer feedback on 3+ presentations', 'map-pin', 'green', 'feedback', 'feedback_given', 3, 5),
        ('All-Star', 'Receive a rubric score of 90%+', 'star', 'yellow', 'performance', 'rubric_score', 90, 10),
        ('Camp Spirit', 'Awarded by counselor for outstanding participation', 'heart', 'rose', 'special', 'manual', 0, 15),
        ('Innovation Award', 'Awarded for creative problem-solving', 'lightbulb', 'cyan', 'special', 'manual', 0, 15)
       ON CONFLICT (name) DO NOTHING`,
      undefined,
      { label: "Seed default badges" }
    );

    return { success: true, message: "Badges tables created and seeded." };
  },
});
