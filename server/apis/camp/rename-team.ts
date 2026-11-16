import { api, z, postgres } from "@superblocksteam/sdk-api";
import { resolveHubViewer } from "../../lib/team-hub.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "RenameTeam",
  description: "Lets a team member fix their team's name",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    team_id: z.number(),
    name: z.string(),
  }),
  output: z.object({ success: z.boolean(), message: z.string(), name: z.string() }),
  async run(ctx, { team_id, name }) {
    const db = ctx.integrations.camp_201_db;
    const clean = name.trim().replace(/\s+/g, " ").slice(0, 40);
    if (clean.length < 2) return { success: false, message: "Team name needs at least 2 characters.", name: "" };

    // Team members rename their own team; counselors can rename any team. Identity comes from the sign-in.
    const viewer = await resolveHubViewer(db, ctx.user.email, team_id);
    if (!viewer.isMember && !viewer.isCounselor) {
      return { success: false, message: "Only members of this team can rename it.", name: "" };
    }

    const res = await db.query(
      `WITH upd AS (UPDATE camp201_teams SET name = $2 WHERE id = $1 RETURNING id) SELECT COUNT(*)::int AS n FROM upd`,
      z.object({ n: z.coerce.number() }),
      [team_id, clean],
      { label: "Rename team" }
    );
    if (!res[0]?.n) return { success: false, message: "Team not found.", name: "" };

    return { success: true, message: "Team name updated!", name: clean };
  },
});
