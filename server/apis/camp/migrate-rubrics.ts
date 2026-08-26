import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigrateRubrics",
  description: "Creates rubric tables for presentation scoring",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    // Rubric templates - define criteria for each presentation type
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_rubric_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        criteria JSONB NOT NULL DEFAULT '[]',
        max_total_points INT NOT NULL DEFAULT 100,
        points_to_award INT NOT NULL DEFAULT 10,
        cohort_id INT REFERENCES camp201_cohorts(id),
        created_by INT REFERENCES camp201_campers(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create rubric_templates table" }
    );

    // Rubric submissions - actual scores given by counselors
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_rubric_scores (
        id SERIAL PRIMARY KEY,
        template_id INT NOT NULL REFERENCES camp201_rubric_templates(id),
        team_id INT NOT NULL REFERENCES camp201_teams(id),
        scored_by INT NOT NULL REFERENCES camp201_campers(id),
        scores JSONB NOT NULL DEFAULT '{}',
        total_score INT NOT NULL DEFAULT 0,
        max_score INT NOT NULL DEFAULT 100,
        notes TEXT,
        points_awarded INT NOT NULL DEFAULT 0,
        cohort_id INT REFERENCES camp201_cohorts(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create rubric_scores table" }
    );

    // Seed a default presentation rubric
    const ExistsSchema = z.object({ count: z.coerce.number() });
    const existing = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as count FROM camp201_rubric_templates`,
      ExistsSchema,
      undefined,
      { label: "Check for existing templates" }
    );

    if (existing[0].count === 0) {
      const defaultCriteria = JSON.stringify([
        { id: "clarity", name: "Clarity & Structure", description: "Clear problem statement, logical flow, easy to follow", max_score: 20 },
        { id: "insight", name: "Depth of Insight", description: "Shows genuine understanding of customer/market dynamics", max_score: 20 },
        { id: "creativity", name: "Creativity & Innovation", description: "Novel approach, unexpected connections, fresh thinking", max_score: 20 },
        { id: "data", name: "Data & Evidence", description: "Uses data effectively, cites specific metrics/examples", max_score: 20 },
        { id: "delivery", name: "Delivery & Presence", description: "Confident, engaging, good use of time, team collaboration", max_score: 20 },
      ]);

      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_rubric_templates (name, description, criteria, max_total_points, points_to_award)
         VALUES ('Group Presentation', 'Standard rubric for team group presentations', $1::jsonb, 100, 10)`,
        [defaultCriteria],
        { label: "Seed default rubric template" }
      );
    }

    return { success: true, message: "Rubric tables created and default template seeded." };
  },
});
