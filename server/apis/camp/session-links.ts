import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor, getCounselorAccess } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/** Only http(s) links, so nothing like javascript: can end up in an href. */
const SafeUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((u) => /^https?:\/\/[^\s]+$/i.test(u), "Links must start with http:// or https://");

const LinkInput = z.object({
  title: z.string().trim().min(1, "Give each link a name").max(120),
  url: SafeUrl,
});

export const SessionLinkSchema = z.object({
  id: z.coerce.number(),
  session_bank_id: z.coerce.number(),
  title: z.string(),
  url: z.string(),
  sort_order: z.coerce.number(),
});

/** Replaces the full list of links on one Session Bank session (counselors only). */
export const SaveSessionLinks = api({
  name: "SaveSessionLinks",
  description: "Replaces the slide deck / resource links on a session",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    session_bank_id: z.number().int().positive(),
    links: z.array(LinkInput).max(10, "Up to 10 links per session"),
  }),
  output: z.object({ count: z.number() }),
  async run(ctx, { session_bank_id, links }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);

    await db.execute(`DELETE FROM camp201_session_links WHERE session_bank_id = $1`, [session_bank_id], {
      label: "Clear session links",
    });
    if (links.length > 0) {
      // One insert for all links (unnest keeps it parameterized).
      await db.execute(
        `INSERT INTO camp201_session_links (session_bank_id, title, url, sort_order, created_by)
         SELECT $1, t.title, t.url, t.ord - 1, $4
         FROM unnest($2::text[], $3::text[]) WITH ORDINALITY AS t(title, url, ord)`,
        [session_bank_id, links.map((l) => l.title), links.map((l) => l.url), (ctx.user.email ?? "").toLowerCase()],
        { label: "Save session links" }
      );
    }
    return { count: links.length };
  },
});

const ResourceRow = z.object({
  id: z.coerce.number(),
  title: z.string(),
  url: z.string(),
  session_bank_id: z.coerce.number(),
  agenda_item_id: z.coerce.number(),
  session_title: z.string(),
  session_type: z.string(),
  day_number: z.coerce.number(),
  start_time: z.string(),
  day_locked: z.boolean(),
});

/**
 * Every session resource on the agenda, one row per (scheduled tile, link).
 * cAMPers only get resources for days the counselors have unlocked.
 */
export const GetAgendaResources = api({
  name: "GetAgendaResources",
  description: "Lists agenda session resources; cAMPers only see unlocked days",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ resources: z.array(ResourceRow) }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const resources = await db.query(
      `SELECT l.id, l.title, l.url, l.session_bank_id,
              a.id AS agenda_item_id, a.title AS session_title, a.session_type,
              a.day_number, a.start_time::text AS start_time,
              COALESCE(cfg.value = 'true', false) AS day_locked
       FROM camp201_session_links l
       JOIN camp201_agenda a ON a.session_bank_id = l.session_bank_id
       LEFT JOIN camp201_config cfg ON cfg.key = 'agenda_day_' || a.day_number || '_locked'
       ORDER BY a.day_number, a.start_time, l.sort_order, l.id
       LIMIT 300`,
      ResourceRow,
      undefined,
      { label: "Fetch agenda resources" }
    );

    const access = await getCounselorAccess(db, ctx.user.email);
    if (access.isAdmin) return { resources };
    return { resources: resources.filter((r) => !r.day_locked) };
  },
});
