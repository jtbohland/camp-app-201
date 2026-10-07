import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getActiveCohortId, requireCounselor } from "../../lib/cohort.js";
import { archiveCohortToLegacyWall } from "../../lib/legacy-wall.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "ArchiveCohortToLegacyWall",
  description: "Adds the closed cohort's teams to the Legacy Wall",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    archived: z.boolean(),
    cohort_number: z.number().nullable(),
    teams_archived: z.number(),
    members_archived: z.number(),
    message: z.string(),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);

    const closed = await db.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_closed' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Check camp closed" }
    );
    if (closed[0]?.value !== "true") {
      throw new Error("Close cAMP before adding this cohort to the Legacy Wall.");
    }

    const cohortId = await getActiveCohortId(db);
    if (cohortId === null) throw new Error("No active cohort.");

    const champ = await db.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_champ_team_id' LIMIT 1`,
      z.object({ value: z.string() }),
      undefined,
      { label: "Get cAMP Champ" }
    );
    const champTeamId = champ.length > 0 ? parseInt(champ[0].value, 10) || null : null;

    return archiveCohortToLegacyWall(db, cohortId, champTeamId);
  },
});
