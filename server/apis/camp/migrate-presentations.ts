import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigratePresentations",
  description: "Creates the presentations and presentation_feedback tables.",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean() }),
  async run(ctx) {
    // Presentations table
    await ctx.integrations.camp_db.execute(`
      CREATE TABLE IF NOT EXISTS camp201_presentations (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        instructions TEXT,
        resources JSONB DEFAULT '[]'::jsonb,
        prep_time_minutes INTEGER DEFAULT 30,
        present_time_minutes INTEGER DEFAULT 10,
        team_id INTEGER REFERENCES camp201_teams(id),
        day_number INTEGER,
        status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
        sort_order INTEGER DEFAULT 0,
        created_by INTEGER REFERENCES camp201_campers(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `, undefined, { label: "Create presentations table" });

    // Presentation feedback (peer feedback per presentation)
    await ctx.integrations.camp_db.execute(`
      CREATE TABLE IF NOT EXISTS camp201_presentation_feedback (
        id SERIAL PRIMARY KEY,
        presentation_id INTEGER NOT NULL REFERENCES camp201_presentations(id),
        submitted_by INTEGER NOT NULL REFERENCES camp201_campers(id),
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        strengths TEXT,
        improvements TEXT,
        comment TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(presentation_id, submitted_by)
      )
    `, undefined, { label: "Create presentation_feedback table" });

    // Presentation rubric scores (counselor-scored)
    await ctx.integrations.camp_db.execute(`
      CREATE TABLE IF NOT EXISTS camp201_presentation_scores (
        id SERIAL PRIMARY KEY,
        presentation_id INTEGER NOT NULL REFERENCES camp201_presentations(id),
        criterion TEXT NOT NULL,
        max_points INTEGER NOT NULL DEFAULT 10,
        score INTEGER,
        notes TEXT,
        scored_by INTEGER REFERENCES camp201_campers(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `, undefined, { label: "Create presentation_scores table" });

    return { success: true };
  },
});
