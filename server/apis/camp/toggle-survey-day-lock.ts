import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";
import { getSurveyDayState } from "../../lib/survey-days.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/**
 * Lock = closed: nobody can submit and nobody gets a "missed survey" reminder.
 * Unlock before the 9 AM deadline = normal (on time until 9 AM the next morning).
 * Unlock after the deadline = reopened: on time, no late penalty, until a counselor locks it again.
 */
export default api({
  name: "ToggleSurveyDayLock",
  description: "Counselor closes or reopens a survey day",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    day_number: z.number().int().min(1).max(10),
    locked: z.boolean(),
  }),
  output: z.object({
    success: z.boolean(),
    reopened: z.boolean(),
  }),
  async run(ctx, { day_number, locked }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);

    let value = "true";
    if (!locked) {
      const state = await getSurveyDayState(db, day_number);
      const pastDeadline = state.deadline !== null && Date.now() > state.deadline.getTime();
      value = pastDeadline ? "open" : "false";
    }
    await db.execute(
      `INSERT INTO camp201_config (key, value)
       VALUES ($1, $2)
       ON CONFLICT (key) DO UPDATE SET value = $2`,
      [`survey_day_${day_number}_locked`, value],
      { label: `Set survey day ${day_number}: ${value}` }
    );
    return { success: true, reopened: value === "open" };
  },
});
