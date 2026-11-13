import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, getActiveCohortId, requireCounselor } from "../../lib/cohort.js";
import { finalizeLogoVote } from "../../lib/logo-vote.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "CloseLogoVoting",
  description: "Counselor closes logo voting and awards team points",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    finalized: z.boolean(),
    message: z.string(),
    best_logo_team_ids: z.array(z.number()),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);

    const cohortId = await getActiveCohortId(db);
    if (cohortId === null) throw new Error("No active cohort.");
    return finalizeLogoVote(db, cohortId);
  },
});
