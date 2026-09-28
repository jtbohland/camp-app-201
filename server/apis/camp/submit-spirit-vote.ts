import { api, z, postgres } from "@superblocksteam/sdk-api";
import { isCampClosed } from "../../lib/camp-closed-guard.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "SubmitSpiritVote",
  description: "Submits a Camp Spirit peer vote",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    voter_id: z.number(),
    nominee_id: z.number(),
    note: z.string().nullable(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { voter_id, nominee_id, note }) {
    if (await isCampClosed(ctx.integrations.camp_201_db)) {
      throw new Error("cAMP is closed — voting is no longer accepted.");
    }
    if (voter_id === nominee_id) throw new Error("You cannot vote for yourself");
    await ctx.integrations.camp_201_db.execute(
      `INSERT INTO camp201_spirit_votes (voter_id, nominee_id, note, cohort_id)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (voter_id, cohort_id) DO UPDATE
       SET nominee_id = EXCLUDED.nominee_id, note = EXCLUDED.note, created_at = NOW()`,
      [voter_id, nominee_id, note],
      { label: "Submit spirit vote" }
    );
    return { success: true };
  },
});
