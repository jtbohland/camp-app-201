import { api, z, postgres } from "@superblocksteam/sdk-api";
import { cohortIdSql, requireCounselor, resolveViewCohort, getCounselorAccess } from "../../lib/cohort.js";
import {
  READ_COLUMN,
  ThreadRowSchema,
  ThreadSchema,
  allowedThreadIds,
  findCamper,
  threadSelectSql,
  unreadSql,
  withReplies,
} from "../../lib/manager-threads.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";
const RoleSchema = z.enum(["camper", "manager", "counselor"]);
const CountSchema = z.object({ count: z.coerce.number() });

/** cAMPer: notes their manager(s) shared with them, with replies. Never includes counselors-only notes. */
export const GetMyManagerThreads = api({
  name: "GetMyManagerThreads",
  description: "Lists manager notes shared with the signed-in cAMPer",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({ threads: z.array(ThreadSchema), unread_count: z.number() }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const camper = await findCamper(db, ctx.user.email);
    if (!camper) return { threads: [], unread_count: 0 };
    const rows = await db.query(
      `${threadSelectSql("camper")}
       WHERE mc.camper_id = $1 AND mc.visibility = 'camper'
       ORDER BY mc.created_at DESC
       LIMIT 100`,
      ThreadRowSchema,
      [camper.id],
      { label: "cAMPer's manager threads" }
    );
    const threads = await withReplies(db, rows);
    return { threads, unread_count: threads.filter((t) => t.unread).length };
  },
});

/** Counselor: every thread about one cAMPer (both audiences), for the report card. */
export const GetCamperManagerThreads = api({
  name: "GetCamperManagerThreads",
  description: "Lists all manager threads about one cAMPer for counselors",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ camper_id: z.number().int().positive() }),
  output: z.object({ threads: z.array(ThreadSchema) }),
  async run(ctx, { camper_id }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const rows = await db.query(
      `${threadSelectSql("counselor")}
       WHERE mc.camper_id = $1
       ORDER BY mc.created_at DESC
       LIMIT 100`,
      ThreadRowSchema,
      [camper_id],
      { label: "Threads about cAMPer" }
    );
    return { threads: await withReplies(db, rows) };
  },
});

/** Counselor: Manager Messages inbox for the viewed cohort (unread first, then most recent). */
export const GetCounselorManagerInbox = api({
  name: "GetCounselorManagerInbox",
  description: "Manager messages inbox for counselors with unread counts",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ limit: z.number().int().min(1).max(50) }),
  output: z.object({ threads: z.array(ThreadSchema), unread_count: z.number() }),
  async run(ctx, { limit }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const VIEW = cohortIdSql((await resolveViewCohort(db, ctx.user.email)).cohortId);
    const rows = await db.query(
      `${threadSelectSql("counselor")}
       WHERE c.cohort_id = ${VIEW}
       ORDER BY ${unreadSql("counselor")} DESC,
                GREATEST(mc.created_at, COALESCE((SELECT MAX(r.created_at) FROM camp201_manager_comment_replies r WHERE r.comment_id = mc.id), mc.created_at)) DESC
       LIMIT ${Math.trunc(limit)}`,
      ThreadRowSchema,
      undefined,
      { label: "Counselor manager inbox" }
    );
    const unread = await db.query(
      `SELECT COUNT(*) AS count FROM camp201_manager_comments mc
       JOIN camp201_campers c ON c.id = mc.camper_id
       WHERE c.cohort_id = ${VIEW} AND ${unreadSql("counselor")}`,
      CountSchema,
      undefined,
      { label: "Counselor unread count" }
    );
    return { threads: await withReplies(db, rows), unread_count: unread[0]?.count ?? 0 };
  },
});

/** Unread badges for the signed-in user: cAMPer sidebar dot, counselor nav count, per-cAMPer tile badges. */
export const GetManagerThreadBadges = api({
  name: "GetManagerThreadBadges",
  description: "Unread manager-message counts for badges",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: z.object({
    camper_unread: z.number(),
    counselor_unread: z.number(),
    by_camper: z.array(z.object({ camper_id: z.number(), unread: z.number(), total: z.number() })),
  }),
  async run(ctx) {
    const db = ctx.integrations.camp_201_db;
    const camper = await findCamper(db, ctx.user.email);
    let camperUnread = 0;
    if (camper) {
      const rows = await db.query(
        `SELECT COUNT(*) AS count FROM camp201_manager_comments mc WHERE mc.camper_id = $1 AND ${unreadSql("camper")}`,
        CountSchema, [camper.id], { label: "cAMPer unread count" }
      );
      camperUnread = rows[0]?.count ?? 0;
    }

    const access = await getCounselorAccess(db, ctx.user.email);
    if (!access.isAdmin || access.isGuestJudge) {
      return { camper_unread: camperUnread, counselor_unread: 0, by_camper: [] };
    }
    const VIEW = cohortIdSql((await resolveViewCohort(db, ctx.user.email)).cohortId);
    const perCamper = await db.query(
      `SELECT mc.camper_id,
              COUNT(*) FILTER (WHERE ${unreadSql("counselor")}) AS unread,
              COUNT(*) AS total
       FROM camp201_manager_comments mc
       JOIN camp201_campers c ON c.id = mc.camper_id
       WHERE c.cohort_id = ${VIEW}
       GROUP BY mc.camper_id
       LIMIT 500`,
      z.object({ camper_id: z.coerce.number(), unread: z.coerce.number(), total: z.coerce.number() }),
      undefined,
      { label: "Counselor unread by cAMPer" }
    );
    return {
      camper_unread: camperUnread,
      counselor_unread: perCamper.reduce((s, r) => s + r.unread, 0),
      by_camper: perCamper,
    };
  },
});

/** Reply in a thread. cAMPers can only reply (never start a thread) and only on notes shared with them. */
export const ReplyToManagerThread = api({
  name: "ReplyToManagerThread",
  description: "Adds a reply to a manager thread as cAMPer, manager or counselor",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    comment_id: z.number().int().positive(),
    as_role: RoleSchema,
    content: z.string().trim().min(1).max(2000),
  }),
  output: z.object({ success: z.boolean(), reply_id: z.number() }),
  async run(ctx, { comment_id, as_role, content }) {
    const db = ctx.integrations.camp_201_db;
    const { ids, authorName } = await allowedThreadIds(db, as_role, ctx.user.email, [comment_id]);
    if (ids.length === 0) throw new Error("You can't reply to this conversation.");

    const inserted = await db.query(
      `INSERT INTO camp201_manager_comment_replies (comment_id, author_type, author_email, author_name, content)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [comment_id, as_role, (ctx.user.email ?? "").toLowerCase(), authorName, content],
      { label: "Insert thread reply" }
    );
    // Replying means you've read everything so far
    await db.execute(
      `UPDATE camp201_manager_comments SET ${READ_COLUMN[as_role]} = NOW() WHERE id = $1`,
      [comment_id],
      { label: "Mark thread read for replier" }
    );
    return { success: true, reply_id: inserted[0].id };
  },
});

/** cAMPer: "👍 Got it" on a note from their manager. */
export const AcknowledgeManagerThread = api({
  name: "AcknowledgeManagerThread",
  description: "Lets a cAMPer acknowledge a manager note",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ comment_id: z.number().int().positive() }),
  output: z.object({ success: z.boolean() }),
  async run(ctx, { comment_id }) {
    const db = ctx.integrations.camp_201_db;
    const { ids } = await allowedThreadIds(db, "camper", ctx.user.email, [comment_id]);
    if (ids.length === 0) throw new Error("You can't acknowledge this note.");
    await db.execute(
      `UPDATE camp201_manager_comments
       SET acknowledged_at = COALESCE(acknowledged_at, NOW()), camper_read_at = NOW()
       WHERE id = $1`,
      [comment_id],
      { label: "Acknowledge manager note" }
    );
    return { success: true };
  },
});

/** Mark threads read for the signed-in user in the given role. Ids they can't access are ignored. */
export const MarkManagerThreadsRead = api({
  name: "MarkManagerThreadsRead",
  description: "Marks manager threads as read for the signed-in user",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    as_role: RoleSchema,
    comment_ids: z.array(z.number().int().positive()).max(300),
  }),
  output: z.object({ marked: z.number() }),
  async run(ctx, { as_role, comment_ids }) {
    const db = ctx.integrations.camp_201_db;
    const { ids } = await allowedThreadIds(db, as_role, ctx.user.email, comment_ids);
    if (ids.length === 0) return { marked: 0 };
    await db.execute(
      `UPDATE camp201_manager_comments SET ${READ_COLUMN[as_role]} = NOW() WHERE id = ANY($1::int[])`,
      [ids],
      { label: "Mark threads read" }
    );
    return { marked: ids.length };
  },
});
