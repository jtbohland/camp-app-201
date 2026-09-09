import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

/**
 * Distributes campers into N balanced teams, diversifying by region and role.
 * Uses a round-robin assignment with sorting by (region, role) so same-region
 * and same-role campers get spread across different teams.
 */
function balancedAssign(
  campers: { id: number; region: string | null; role: string | null }[],
  numTeams: number
): number[][] {
  // Group campers by region, then within each region sort by role
  const byRegion: Record<string, typeof campers> = {};
  for (const c of campers) {
    const key = c.region?.toLowerCase().trim() || "_unknown";
    if (!byRegion[key]) byRegion[key] = [];
    byRegion[key].push(c);
  }

  // Sort each region group by role for intra-region diversity
  for (const key of Object.keys(byRegion)) {
    byRegion[key].sort((a, b) => (a.role ?? "").localeCompare(b.role ?? ""));
  }

  // Interleave regions: take one from each region in rotation
  const regionKeys = Object.keys(byRegion).sort((a, b) => byRegion[b].length - byRegion[a].length);
  const interleaved: typeof campers = [];
  let maxLen = Math.max(...regionKeys.map(k => byRegion[k].length));
  for (let i = 0; i < maxLen; i++) {
    for (const key of regionKeys) {
      if (i < byRegion[key].length) {
        interleaved.push(byRegion[key][i]);
      }
    }
  }

  // Round-robin assign to teams
  const teams: number[][] = Array.from({ length: numTeams }, () => []);
  interleaved.forEach((c, idx) => {
    teams[idx % numTeams].push(c.id);
  });

  return teams;
}

export default api({
  name: "AutoGenerateTeams",
  description: "Auto-creates balanced teams from registered campers, distributed by region and role",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    num_teams: z.number().min(2).max(10),
  }),
  output: z.object({
    success: z.boolean(),
    message: z.string(),
    teams: z.array(z.object({
      team_id: z.number(),
      team_name: z.string(),
      member_count: z.number(),
    })),
  }),
  async run(ctx, { num_teams }) {
    // Get all registered campers (not counselors/admins)
    const campers = await ctx.integrations.apps_database.query(
      `SELECT id, first_name, last_name, region, role
       FROM camp201_campers
       WHERE role NOT IN ('counselor', 'admin')
       ORDER BY id
       LIMIT 100`,
      z.object({
        id: z.coerce.number(),
        first_name: z.string(),
        last_name: z.string(),
        region: z.string().nullable(),
        role: z.string().nullable(),
      }),
      undefined,
      { label: "Fetch campers for team assignment" }
    );

    if (campers.length === 0) {
      return { success: false, message: "No campers registered yet", teams: [] };
    }

    if (campers.length < num_teams) {
      return { success: false, message: `Only ${campers.length} campers registered — need at least ${num_teams} for ${num_teams} teams`, teams: [] };
    }

    // Check if teams already exist
    const existingTeams = await ctx.integrations.apps_database.query(
      `SELECT COUNT(*)::int as cnt FROM camp201_teams LIMIT 1`,
      z.object({ cnt: z.coerce.number() }),
      undefined,
      { label: "Check existing teams" }
    );
    if (existingTeams[0].cnt > 0) {
      return { success: false, message: "Teams already exist. Delete existing teams first if you want to regenerate.", teams: [] };
    }

    // Generate balanced assignments
    const assignments = balancedAssign(campers, num_teams);

    // Create teams and assign members
    const createdTeams: { team_id: number; team_name: string; member_count: number }[] = [];

    for (let i = 0; i < num_teams; i++) {
      const teamName = `Team ${i + 1}`;
      const teamResult = await ctx.integrations.apps_database.query(
        `INSERT INTO camp201_teams (name, logo_url, color)
         VALUES ($1, '', '')
         RETURNING id`,
        z.object({ id: z.coerce.number() }),
        [teamName],
        { label: `Create ${teamName}` }
      );

      const teamId = teamResult[0].id;
      const memberIds = assignments[i];

      if (memberIds.length > 0) {
        // Assign all members to this team
        await ctx.integrations.apps_database.execute(
          `UPDATE camp201_campers SET team_id = $1 WHERE id = ANY($2::int[])`,
          [teamId, memberIds],
          { label: `Assign ${memberIds.length} members to ${teamName}` }
        );
      }

      createdTeams.push({ team_id: teamId, team_name: teamName, member_count: memberIds.length });
    }

    return {
      success: true,
      message: `Created ${num_teams} teams with ${campers.length} campers balanced by region and role`,
      teams: createdTeams,
    };
  },
});
