import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "UpdatePresentation",
  description: "Counselor edits a presentation's content, timing, and deck",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  // Which day it shows on (and its order) is set on the Presentations board instead.
  input: z.object({
    id: z.number(),
    title: z.string().min(1),
    description: z.string().nullable(),
    instructions: z.string().nullable(),
    resources: z.string().nullable(), // JSON string of [{label, url}]
    prep_time_minutes: z.number().nullable(),
    present_time_minutes: z.number().nullable(),
    deck_template_url: z.string().nullable(),
    status: z.enum(["upcoming", "in_progress", "completed"]),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    await db.execute(
      `UPDATE camp201_presentations SET
        title = $2,
        description = $3,
        instructions = $4,
        resources = $5::jsonb,
        prep_time_minutes = $6,
        present_time_minutes = $7,
        deck_template_url = $8,
        status = $9
      WHERE id = $1`,
      [
        input.id,
        input.title,
        input.description,
        input.instructions,
        input.resources ?? "[]",
        input.prep_time_minutes,
        input.present_time_minutes,
        input.deck_template_url ?? "",
        input.status,
      ],
      { label: "Update presentation" }
    );
    return { success: true };
  },
});
