import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";
import { ReportCardSchema, loadReportCard } from "../../lib/report-card.js";
import { requireReportAccess } from "../../lib/report-access.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "GetCamperReportCard",
  description: "Counselor-only full report card for one cAMPer",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ camper_id: z.number() }),
  output: ReportCardSchema,
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    return loadReportCard(db, camper_id, { includePin: true, includeDietary: true });
  },
});

/** Manager view of the same report card: only for cAMPers on their dashboard, never shows the PIN. */
export const GetManagerReportCard = api({
  name: "GetManagerReportCard",
  description: "Full report card for one of the manager's own hires",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ camper_id: z.number() }),
  output: ReportCardSchema,
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    const viewer = await requireReportAccess(db, ctx.user.email, camper_id);
    const isCounselor = viewer === "counselor";
    return loadReportCard(db, camper_id, { includePin: isCounselor, includeDietary: isCounselor });
  },
});
