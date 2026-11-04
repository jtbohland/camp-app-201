import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getCounselorAccess } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetMyAccess",
  description: "Returns whether the signed-in user is a counselor or guest judge",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    isAdmin: z.boolean(),
    /** Temporary counselor access for judging. Has no counselor profile. */
    isGuestJudge: z.boolean(),
    email: z.string(),
  }),
  async run(ctx) {
    const email = (ctx.user.email ?? "").toLowerCase();
    if (!email) return { isAdmin: false, isGuestJudge: false, email: "" };

    // Counselor = on the verified admin list, a counselor record, or an active guest judge.
    const access = await getCounselorAccess(ctx.integrations.camp_201_db, email);
    return { isAdmin: access.isAdmin, isGuestJudge: access.isGuestJudge, email };
  },
});
