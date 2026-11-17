import { api, z, postgres } from "@superblocksteam/sdk-api";
import { assertNotViewingPast, requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const Id = z.object({ id: z.coerce.number() });

/** Counselors fix a posted announcement: title, body, priority, pin. */
export const UpdateAnnouncement = api({
  name: "UpdateAnnouncement",
  description: "Counselor edits a posted announcement",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    announcement_id: z.number().int().positive(),
    title: z.string().trim().min(1, "Add a title").max(200),
    body: z.string().trim().min(1, "Add a message").max(5000),
    priority: z.enum(["normal", "important", "urgent"]),
    pinned: z.boolean(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    const rows = await db.query(
      `WITH u AS (
         UPDATE camp201_announcements
         SET title = $2, body = $3, priority = $4, pinned = $5
         WHERE id = $1
         RETURNING id
       ) SELECT id FROM u LIMIT 1`,
      Id,
      [input.announcement_id, input.title, input.body, input.priority, input.pinned],
      { label: "Update announcement" }
    );
    if (rows.length === 0) throw new Error("That announcement no longer exists.");
    return { success: true };
  },
});

/** Counselors remove a posted announcement. */
export const DeleteAnnouncement = api({
  name: "DeleteAnnouncement",
  description: "Counselor deletes a posted announcement",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ announcement_id: z.number().int().positive() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { announcement_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await assertNotViewingPast(db, ctx.user.email);
    await db.query(
      `WITH d AS (DELETE FROM camp201_announcements WHERE id = $1 RETURNING id) SELECT id FROM d LIMIT 1`,
      Id,
      [announcement_id],
      { label: "Delete announcement" }
    );
    return { success: true };
  },
});
