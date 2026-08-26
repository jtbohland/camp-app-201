import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "MigratePeerFeedback",
  description: "Creates peer feedback table for live presentation feedback",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({ success: z.boolean(), message: z.string() }),
  async run(ctx) {
    await ctx.integrations.apps_database.execute(
      `CREATE TABLE IF NOT EXISTS camp201_peer_feedback (
        id SERIAL PRIMARY KEY,
        session_label TEXT NOT NULL,
        team_id INTEGER REFERENCES camp201_teams(id),
        author_id INTEGER NOT NULL REFERENCES camp201_campers(id),
        category TEXT NOT NULL DEFAULT 'general',
        content TEXT NOT NULL,
        cohort_id INTEGER REFERENCES camp201_cohorts(id),
        points_awarded INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`,
      undefined,
      { label: "Create peer feedback table" }
    );

    return { success: true, message: "Peer feedback table created." };
  },
});
