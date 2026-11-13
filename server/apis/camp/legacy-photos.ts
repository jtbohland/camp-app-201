import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/** Data URLs for photos, capped so a stray huge image can't bloat the database. */
const PhotoData = z
  .string()
  .regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/, "Photo must be an image")
  .max(4_000_000, "Photo is too large");

const GroupPhotoSchema = z.object({
  id: z.coerce.number(),
  past_cohort_id: z.coerce.number().nullable(),
  cohort_number: z.coerce.number(),
  label: z.string(),
  photo_data: z.string(),
  created_at: z.string(),
});

/** Every cohort's group photo, oldest cohort first (for the carousel and the Hub library). */
export const GetGroupPhotos = api({
  name: "GetGroupPhotos",
  description: "Lists cAMP 201 group photos in cohort order",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ photos: z.array(GroupPhotoSchema) }),
  async run(ctx) {
    const photos = await ctx.integrations.camp_201_db.query(
      `SELECT id, past_cohort_id, cohort_number, label, photo_data, created_at::text
       FROM camp201_group_photos
       ORDER BY cohort_number ASC, created_at ASC
       LIMIT 50`,
      GroupPhotoSchema,
      undefined,
      { label: "Fetch group photos" }
    );
    return { photos };
  },
});

/** Adds a group photo, or replaces one (id set). Counselors only. */
export const SaveGroupPhoto = api({
  name: "SaveGroupPhoto",
  description: "Adds or updates a cohort group photo (counselors)",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    id: z.number().nullable(),
    cohort_number: z.number().int().min(1).max(999),
    label: z.string().trim().min(1).max(60),
    /** Null keeps the existing photo when editing. */
    photo_data: PhotoData.nullable(),
  }),
  output: z.object({ id: z.number() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const pastCohort = `(SELECT id FROM camp201_past_cohorts WHERE cohort_number = $1 LIMIT 1)`;

    if (input.id === null) {
      if (!input.photo_data) throw new Error("Choose a photo to upload.");
      const rows = await db.query(
        `INSERT INTO camp201_group_photos (past_cohort_id, cohort_number, label, photo_data, uploaded_by)
         VALUES (${pastCohort}, $1, $2, $3, $4)
         RETURNING id`,
        z.object({ id: z.coerce.number() }),
        [input.cohort_number, input.label, input.photo_data, (ctx.user.email ?? "").toLowerCase()],
        { label: "Add group photo" }
      );
      return { id: rows[0].id };
    }

    await db.execute(
      `UPDATE camp201_group_photos
       SET past_cohort_id = ${pastCohort}, cohort_number = $1, label = $2,
           photo_data = COALESCE($3, photo_data), updated_at = NOW()
       WHERE id = $4`,
      [input.cohort_number, input.label, input.photo_data, input.id],
      { label: "Update group photo" }
    );
    return { id: input.id };
  },
});

export const DeleteGroupPhoto = api({
  name: "DeleteGroupPhoto",
  description: "Deletes a cohort group photo (counselors)",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ id: z.number() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await db.execute(`DELETE FROM camp201_group_photos WHERE id = $1`, [id], { label: "Delete group photo" });
    return { success: true };
  },
});

/** Sets or clears a Legacy Wall team's trophy photo. Counselors only. */
export const SaveTrophyPhoto = api({
  name: "SaveTrophyPhoto",
  description: "Sets or removes a winning team's trophy photo (counselors)",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    team_id: z.number(),
    /** Null removes the photo. */
    photo_data: PhotoData.nullable(),
  }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { team_id, photo_data }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await db.execute(
      `UPDATE camp201_past_teams SET trophy_photo_url = $1 WHERE id = $2`,
      [photo_data, team_id],
      { label: "Save trophy photo" }
    );
    return { success: true };
  },
});

/** Sets or clears the signed-in counselor's LEGO minifig (transparent PNG). */
export const SaveCounselorLego = api({
  name: "SaveCounselorLego",
  description: "Saves the signed-in counselor's LEGO minifig image",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ lego_data: PhotoData.nullable() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { lego_data }) {
    const db = ctx.integrations.camp_201_db;
    const email = (ctx.user.email ?? "").toLowerCase();
    await requireCounselor(db, email);
    await db.execute(
      `UPDATE camp201_campers SET lego_url = $2, updated_at = NOW()
       WHERE lower(email) = $1 AND role IN ('counselor', 'admin')`,
      [email, lego_data],
      { label: "Save counselor LEGO" }
    );
    return { success: true };
  },
});
