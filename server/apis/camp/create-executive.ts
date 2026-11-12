import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "CreateExecutive",
  description: "Adds a guest speaker with the email and Slack name they'll use",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    name: z.string().trim().min(1).max(200),
    title: z.string().max(200),
    // Uploaded photos are stored as image data URLs (often 50–150 KB after resizing),
    // so the limit must allow far more than a plain web link. ~3M chars ≈ a 2 MB file.
    photo_url: z.string().max(3_000_000, "That photo is too large. Try a smaller image.").nullable(),
    bio: z.string().max(5000).nullable(),
    linkedin_url: z.string().max(500).nullable(),
    email: z.string().trim().toLowerCase().email().max(200),
    slack_name: z.string().trim().min(1).max(100),
    /** The agenda session this speaker appears in; shows them on that day once it's unlocked. */
    agenda_item_id: z.number().int().positive().nullable(),
  }),
  output: z.object({
    id: z.coerce.number(),
    success: z.boolean(),
  }),
  async run(ctx, { name, title, photo_url, bio, linkedin_url, email, slack_name, agenda_item_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const result = await db.query(
      `INSERT INTO camp201_executives (name, title, photo_url, bio, linkedin_url, email, slack_name, agenda_item_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, (SELECT id FROM camp201_agenda WHERE id = $8::int))
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [name, title, photo_url ?? "", bio ?? "", linkedin_url ?? "", email, slack_name.replace(/^@/, ""), agenda_item_id],
      { label: "Create executive" }
    );

    return { id: result[0].id, success: true };
  },
});
