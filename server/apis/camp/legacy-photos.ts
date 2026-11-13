import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/** Data URLs for photos, capped so a stray huge image can't bloat the database. */
const PhotoData = z
  .string()
  .regex(/^data:image\/(png|jpeg|jpg|webp|gif);base64,/, "Photo must be an image")
  .max(4_000_000, "Photo is too large");

const PhotoKind = z.enum(["group", "trophy"]);
const Focus = z.number().int().min(0).max(100);

const LegacyPhotoSchema = z.object({
  id: z.coerce.number(),
  kind: PhotoKind,
  past_cohort_id: z.coerce.number().nullable(),
  cohort_number: z.coerce.number(),
  label: z.string(),
  photo_data: z.string(),
  /** Where the photo is anchored when cropped (percent). */
  focus_x: z.coerce.number(),
  focus_y: z.coerce.number(),
  created_at: z.string(),
});

/** Every group and trophy photo, oldest cohort first (carousel, champion tiles, Hub library). */
export const GetGroupPhotos = api({
  name: "GetGroupPhotos",
  description: "Lists cAMP 201 group and trophy photos in cohort order",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ photos: z.array(LegacyPhotoSchema) }),
  async run(ctx) {
    const photos = await ctx.integrations.camp_201_db.query(
      `SELECT id, kind, past_cohort_id, cohort_number, label, photo_data, focus_x, focus_y, created_at::text
       FROM camp201_group_photos
       ORDER BY cohort_number ASC, created_at ASC
       LIMIT 100`,
      LegacyPhotoSchema,
      undefined,
      { label: "Fetch legacy photos" }
    );
    return { photos };
  },
});

/**
 * Adds or updates a group or trophy photo. Counselors only.
 * - id set: updates label/position, and the photo if photo_data is given.
 * - id null, trophy: one per cohort, so it replaces that cohort's trophy photo.
 */
export const SaveGroupPhoto = api({
  name: "SaveGroupPhoto",
  description: "Adds or updates a cohort group or trophy photo (counselors)",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    id: z.number().nullable(),
    kind: PhotoKind,
    cohort_number: z.number().int().min(1).max(999),
    label: z.string().trim().min(1).max(60),
    /** Null keeps the existing photo when editing. */
    photo_data: PhotoData.nullable(),
    focus_x: Focus,
    focus_y: Focus,
  }),
  output: z.object({ id: z.number() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const pastCohort = `(SELECT id FROM camp201_past_cohorts WHERE cohort_number = $1 LIMIT 1)`;
    const uploader = (ctx.user.email ?? "").toLowerCase();

    if (input.id === null) {
      if (!input.photo_data) throw new Error("Choose a photo to upload.");
      const conflict =
        input.kind === "trophy"
          ? `ON CONFLICT (cohort_number) WHERE kind = 'trophy' DO UPDATE
               SET photo_data = EXCLUDED.photo_data, label = EXCLUDED.label,
                   focus_x = EXCLUDED.focus_x, focus_y = EXCLUDED.focus_y,
                   uploaded_by = EXCLUDED.uploaded_by, updated_at = NOW()`
          : "";
      const rows = await db.query(
        `INSERT INTO camp201_group_photos (past_cohort_id, cohort_number, label, photo_data, uploaded_by, kind, focus_x, focus_y)
         VALUES (${pastCohort}, $1, $2, $3, $4, $5, $6, $7)
         ${conflict}
         RETURNING id`,
        z.object({ id: z.coerce.number() }),
        [input.cohort_number, input.label, input.photo_data, uploader, input.kind, input.focus_x, input.focus_y],
        { label: `Add ${input.kind} photo` }
      );
      return { id: rows[0].id };
    }

    await db.execute(
      `UPDATE camp201_group_photos
       SET past_cohort_id = ${pastCohort}, cohort_number = $1, label = $2,
           photo_data = COALESCE($3, photo_data), focus_x = $4, focus_y = $5, updated_at = NOW()
       WHERE id = $6 AND kind = $7`,
      [input.cohort_number, input.label, input.photo_data, input.focus_x, input.focus_y, input.id, input.kind],
      { label: `Update ${input.kind} photo` }
    );
    return { id: input.id };
  },
});

export const DeleteGroupPhoto = api({
  name: "DeleteGroupPhoto",
  description: "Deletes a cohort group or trophy photo (counselors)",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ id: z.number() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    await db.execute(`DELETE FROM camp201_group_photos WHERE id = $1`, [id], { label: "Delete legacy photo" });
    return { success: true };
  },
});

/** Sets or clears the signed-in counselor's LEGO Me image (transparent PNG or a regular photo). */
export const SaveCounselorLego = api({
  name: "SaveCounselorLego",
  description: "Saves the signed-in counselor's LEGO Me image",
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
