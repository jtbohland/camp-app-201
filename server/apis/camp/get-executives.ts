import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getCounselorAccess, getSpeakerAccess } from "../../lib/cohort.js";

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
  /** The agenda session the speaker appears in, and that session's day + start time. */
  agenda_item_id: z.coerce.number().nullable(),
  session_title: z.string().nullable(),
  day_number: z.coerce.number().nullable(),
  start_time: z.string().nullable(),
  /** Counselors only: true when the speaker's day is still locked for cAMPers. */
  day_locked: z.boolean(),
});

export default api({
  name: "GetExecutives",
  description: "Fetches guest speakers with their session day; cAMPers only see unlocked days",
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
    const whereClause = active_only ? "WHERE e.is_active = true" : "";
    const executives = await db.query(
      `SELECT e.id, e.name, e.title, e.photo_url, e.bio, e.linkedin_url, e.is_active,
              NULLIF(btrim(e.email), '') AS email, NULLIF(btrim(e.slack_name), '') AS slack_name,
              e.link_copied_at::text AS link_copied_at,
              a.id AS agenda_item_id, a.title AS session_title, a.day_number, a.start_time::text AS start_time,
              COALESCE(cfg.value = 'true', false) AS day_locked
       FROM camp201_executives e
       LEFT JOIN camp201_agenda a ON a.id = e.agenda_item_id
       LEFT JOIN camp201_config cfg ON cfg.key = 'agenda_day_' || a.day_number || '_locked'
       ${whereClause}
       ORDER BY a.day_number NULLS LAST, a.start_time NULLS LAST, e.name
       LIMIT 100`,
      ExecutiveSchema,
      undefined,
      { label: "Fetch executives with session day" }
    );

    const access = await getCounselorAccess(db, ctx.user.email);
    if (access.isAdmin) return { executives };

    // cAMPers (and speakers) see a speaker only once their session's day is unlocked.
    // A speaker always sees their own tile.
    const speaker = await getSpeakerAccess(db, ctx.user.email);
    const visible = executives.filter(
      (e) => (e.day_number !== null && !e.day_locked) || (speaker && speaker.executiveId === e.id)
    );
    return { executives: visible.map((e) => ({ ...e, link_copied_at: null, day_locked: false })) };
  },
});
