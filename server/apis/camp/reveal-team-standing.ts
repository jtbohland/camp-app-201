import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "RevealTeamStanding",
  description: "Reveals a single team's standing during the podium ceremony",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    team_id: z.number(),
  }),
  output: z.object({ success: z.boolean(), revealed_team_ids: z.array(z.number()) }),
  async run(ctx, { team_id }) {
    // Get current revealed list
    const result = await ctx.integrations.camp_201_db.query(
      `SELECT value FROM camp201_config WHERE key = 'revealed_team_ids' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Get revealed teams" }
    );
    let revealed: number[] = [];
    if (result.length > 0) {
      try { revealed = JSON.parse(result[0].value); } catch { /* empty */ }
    }

    // Add team if not already revealed
    if (!revealed.includes(team_id)) {
      revealed.push(team_id);
    }

    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_config (key, value, updated_at) VALUES ('revealed_team_ids', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [JSON.stringify(revealed)],
      { label: "Update revealed teams" }
    );

    return { success: true, revealed_team_ids: revealed };
  },
});
