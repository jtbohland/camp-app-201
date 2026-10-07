import { api, z, postgres } from "@superblocksteam/sdk-api";
import { ACTIVE_COHORT_ID_SQL, assertNotViewingPast } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "CreateTeam",
  description: "Creates a team in the active cohort",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    name: z.string(),
    logo_url: z.string().nullable(),
    color: z.string(),
  }),
  output: z.object({
    id: z.coerce.number(),
    success: z.boolean(),
  }),
  async run(ctx, { name, logo_url, color }) {
    await assertNotViewingPast(ctx.integrations.camp_201_db, ctx.user.email);
    const result = await ctx.integrations.camp_201_db.query(
      `INSERT INTO camp201_teams (name, logo_url, color, cohort_id)
       VALUES ($1, $2, $3, ${ACTIVE_COHORT_ID_SQL})
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [name, logo_url ?? "", color],
      { label: "Create team" }
    );

    return { id: result[0].id, success: true };
  },
});
