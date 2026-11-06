import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireReportAccess } from "../../lib/report-access.js";
import { TimelineEventSchema, TimelineSummarySchema, loadActivityTimeline } from "../../lib/activity-timeline.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetCamperActivity",
  description: "Activity timeline (done and missed) for one cAMPer",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ camper_id: z.number().int().positive() }),
  output: z.object({
    events: z.array(TimelineEventSchema),
    summary: TimelineSummarySchema,
  }),
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireReportAccess(db, ctx.user.email, camper_id);
    return loadActivityTimeline(db, camper_id);
  },
});
