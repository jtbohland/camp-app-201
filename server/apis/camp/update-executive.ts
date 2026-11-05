import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

export default api({
  name: "UpdateExecutive",
  description: "Updates a guest speaker's profile, email, and Slack name",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
    name: z.string().trim().min(1).max(200),
    title: z.string().max(200),
    photo_url: z.string().max(2000).nullable(),
    bio: z.string().max(5000).nullable(),
    linkedin_url: z.string().max(500).nullable(),
    is_active: z.boolean(),
    email: z.string().trim().toLowerCase().email().max(200),
    slack_name: z.string().trim().min(1).max(100),
  }),
  output: z.object({
    success: z.boolean(),
  }),
  async run(ctx, { id, name, title, photo_url, bio, linkedin_url, is_active, email, slack_name }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    // A new email means a new person to share with, so the link shows as not shared yet.
    await db.execute(
      `UPDATE camp201_executives
       SET name = $1, title = $2, photo_url = $3, bio = $4, linkedin_url = $5, is_active = $6,
           link_copied_at = CASE WHEN lower(btrim(COALESCE(email, ''))) = $8 THEN link_copied_at ELSE NULL END,
           email = $8, slack_name = $9
       WHERE id = $7`,
      [name, title, photo_url ?? "", bio ?? "", linkedin_url ?? "", is_active, id, email, slack_name.replace(/^@/, "")],
      { label: "Update executive" }
    );

    return { success: true };
  },
});
