import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

const FeedbackSchema = z.object({
  id: z.coerce.number(),
  session_label: z.string(),
  team_name: z.string().nullable(),
  author_name: z.string(),
  category: z.string(),
  content: z.string(),
  created_at: z.string(),
});

export default api({
  name: "GetPeerFeedback",
  description: "Gets the public peer feedback board for a given session or all",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    session_label: z.string().nullable(),
    team_id: z.number().nullable(),
  }),
  output: z.object({
    feedback: z.array(FeedbackSchema),
    sessions: z.array(z.string()),
  }),
  async run(ctx, { session_label, team_id }) {
    // Get distinct sessions
    const SessionSchema = z.object({ session_label: z.string() });
    const sessions = await ctx.integrations.apps_database.query(
      `SELECT DISTINCT session_label FROM camp201_peer_feedback
       JOIN camp201_cohorts co ON co.id = camp201_peer_feedback.cohort_id AND co.is_active = true
       ORDER BY session_label LIMIT 50`,
      SessionSchema,
      undefined,
      { label: "Get feedback sessions" }
    );

    // Build query
    let query = `SELECT pf.id, pf.session_label, t.name as team_name,
                        CONCAT(c.first_name, ' ', c.last_name) as author_name,
                        pf.category, pf.content, pf.created_at
                 FROM camp201_peer_feedback pf
                 JOIN camp201_campers c ON c.id = pf.author_id
                 LEFT JOIN camp201_teams t ON t.id = pf.team_id
                 JOIN camp201_cohorts co ON co.id = pf.cohort_id AND co.is_active = true`;

    const conditions: string[] = [];
    const params: any[] = [];

    if (session_label) {
      params.push(session_label);
      conditions.push(`pf.session_label = $${params.length}`);
    }
    if (team_id) {
      params.push(team_id);
      conditions.push(`pf.team_id = $${params.length}`);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY pf.created_at DESC LIMIT 100";

    const feedback = await ctx.integrations.apps_database.query(
      query,
      FeedbackSchema,
      params.length > 0 ? params : undefined,
      { label: "Get peer feedback" }
    );

    return { feedback, sessions: sessions.map(s => s.session_label) };
  },
});
