import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getCounselorAccess } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const ExecutiveSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  title: z.string(),
  photo_url: z.string().nullable(),
  bio: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  is_active: z.boolean(),
  /** The speaker's email: they get app access when they open the share link. */
  email: z.string().nullable(),
  /** Shown to cAMPers so they can message the speaker. */
  slack_name: z.string().nullable(),
  /** Counselors only: when the share link was first copied. */
  link_copied_at: z.string().nullable(),
});

export default api({
  name: "GetExecutives",
  description: "Fetches guest speakers, with share-link status for counselors",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    active_only: z.boolean(),
  }),
  output: z.object({
    executives: z.array(ExecutiveSchema),
  }),
  async run(ctx, { active_only }) {
    const db = ctx.integrations.camp_201_db;
    const whereClause = active_only ? "WHERE is_active = true" : "";
    const executives = await db.query(
      `SELECT id, name, title, photo_url, bio, linkedin_url, is_active,
              NULLIF(btrim(email), '') AS email, NULLIF(btrim(slack_name), '') AS slack_name,
              link_copied_at::text AS link_copied_at
       FROM camp201_executives ${whereClause}
       ORDER BY name
       LIMIT 50`,
      ExecutiveSchema,
      undefined,
      { label: "Fetch executives" }
    );

    // Share-link status is for counselors only.
    const access = await getCounselorAccess(db, ctx.user.email);
    if (!access.isAdmin) {
      return { executives: executives.map((e) => ({ ...e, link_copied_at: null })) };
    }
    return { executives };
  },
});
