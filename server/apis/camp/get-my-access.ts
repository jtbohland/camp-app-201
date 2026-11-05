import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getCounselorAccess, getSpeakerAccess } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetMyAccess",
  description: "Returns whether the signed-in user is a counselor, guest judge, or guest speaker",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({}),
  output: z.object({
    isAdmin: z.boolean(),
    /** Temporary counselor access for judging. Has no counselor profile. */
    isGuestJudge: z.boolean(),
    /** Guest speaker: limited view of the app plus their own Q&A. Never true for counselors. */
    isSpeaker: z.boolean(),
    speakerExecutiveId: z.number().nullable(),
    speakerName: z.string().nullable(),
    email: z.string(),
  }),
  async run(ctx) {
    const email = (ctx.user.email ?? "").toLowerCase();
    if (!email) {
      return { isAdmin: false, isGuestJudge: false, isSpeaker: false, speakerExecutiveId: null, speakerName: null, email: "" };
    }

    // Counselor = on the verified admin list, a counselor record, or an active guest judge.
    const db = ctx.integrations.camp_201_db;
    const access = await getCounselorAccess(db, email);
    const speaker = access.isAdmin ? null : await getSpeakerAccess(db, email);
    return {
      isAdmin: access.isAdmin,
      isGuestJudge: access.isGuestJudge,
      isSpeaker: !!speaker,
      speakerExecutiveId: speaker?.executiveId ?? null,
      speakerName: speaker?.name ?? null,
      email,
    };
  },
});
