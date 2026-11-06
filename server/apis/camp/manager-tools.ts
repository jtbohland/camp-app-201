import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireManager, unreadSql } from "../../lib/manager-threads.js";
import { TimelineEventSchema, loadActivityTimeline } from "../../lib/activity-timeline.js";
import { ItemNoteSchema, loadItemNotes } from "../../lib/item-notes.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";
const MAX_FEED = 200;

const HireRow = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  photo_url: z.string().nullable(),
  points: z.coerce.number(),
});

const AttentionSchema = z.object({
  camper_id: z.number(),
  name: z.string(),
  first_name: z.string(),
  photo_url: z.string().nullable(),
  missed_recent: z.number(),
  unread_replies: z.number(),
  never_contacted: z.boolean(),
  reasons: z.array(z.string()),
});

/** Manager's hires that still exist, plus their unread-reply and thread counts. */
async function loadHires(db: any, managerId: number) {
  const hires = await db.query(
    `SELECT c.id, c.first_name, c.last_name, c.photo_url, COALESCE(c.points, 0) AS points
     FROM camp201_manager_hires mh JOIN camp201_campers c ON c.id = mh.camper_id
     WHERE mh.manager_id = $1 AND c.removed_at IS NULL
     ORDER BY c.first_name LIMIT 50`,
    HireRow, [managerId], { label: "Manager's hires" }
  );
  return hires as z.infer<typeof HireRow>[];
}

/**
 * Manager "Today" view: recent activity across every hire, the manager's own item reactions,
 * and who needs attention (recent misses, unread replies, or never contacted).
 */
export const GetManagerTodayFeed = api({
  name: "GetManagerTodayFeed",
  description: "Recent activity across all of a manager's hires",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({ days: z.union([z.literal(1), z.literal(3), z.literal(7)]) }),
  output: z.object({
    feed: z.array(TimelineEventSchema.extend({ camper_id: z.number(), camper_name: z.string(), camper_first_name: z.string() })),
    item_notes: z.array(ItemNoteSchema),
    attention: z.array(AttentionSchema),
    hire_count: z.number(),
  }),
  async run(ctx, { days }) {
    const db = ctx.integrations.camp_201_db;
    const manager = await requireManager(db, ctx.user.email);
    const hires = await loadHires(db, manager.id);
    if (hires.length === 0) return { feed: [], item_notes: [], attention: [], hire_count: 0 };
    const ids = hires.map((h) => h.id);

    // A manager has a handful of hires (capped at 50), so per-hire timelines are fine here.
    const [timelines, itemNotes, threadStats] = await Promise.all([
      Promise.all(hires.map((h) => loadActivityTimeline(db, h.id))),
      loadItemNotes(db, ids, ctx.user.email, true),
      db.query(
        `SELECT mc.camper_id,
                COUNT(*) FILTER (WHERE ${unreadSql("manager")}) AS unread,
                COUNT(*) AS total
         FROM camp201_manager_comments mc
         WHERE mc.manager_id = $1 AND mc.camper_id = ANY($2::int[])
         GROUP BY mc.camper_id LIMIT 100`,
        z.object({ camper_id: z.coerce.number(), unread: z.coerce.number(), total: z.coerce.number() }),
        [manager.id, ids],
        { label: "Unread replies per hire" }
      ),
    ]);

    const since = Date.now() - days * 24 * 60 * 60 * 1000;
    const attentionSince = Date.now() - 2 * 24 * 60 * 60 * 1000;
    const statsBy = new Map<number, { unread: number; total: number }>(
      (threadStats as { camper_id: number; unread: number; total: number }[]).map((r) => [r.camper_id, r])
    );

    const feed: z.infer<typeof TimelineEventSchema & any>[] = [];
    const attention: z.infer<typeof AttentionSchema>[] = [];

    hires.forEach((h, i) => {
      const events = timelines[i].events;
      for (const e of events) {
        if (new Date(e.at).getTime() >= since) {
          feed.push({ ...e, camper_id: h.id, camper_name: `${h.first_name} ${h.last_name}`, camper_first_name: h.first_name });
        }
      }
      const missedRecent = events.filter((e) => e.status === "missed" && new Date(e.at).getTime() >= attentionSince).length;
      const stats = statsBy.get(h.id) ?? { unread: 0, total: 0 };
      const reasons: string[] = [];
      if (missedRecent > 0) reasons.push(`${missedRecent} missed in the last 2 days`);
      if (stats.unread > 0) reasons.push(`${stats.unread} new repl${stats.unread === 1 ? "y" : "ies"} for you`);
      if (stats.total === 0) reasons.push("You haven't sent a note yet");
      attention.push({
        camper_id: h.id,
        name: `${h.first_name} ${h.last_name}`,
        first_name: h.first_name,
        photo_url: h.photo_url,
        missed_recent: missedRecent,
        unread_replies: stats.unread,
        never_contacted: stats.total === 0,
        reasons,
      });
    });

    feed.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    attention.sort((a, b) => b.reasons.length - a.reasons.length || b.missed_recent - a.missed_recent);

    return { feed: feed.slice(0, MAX_FEED), item_notes: itemNotes, attention, hire_count: hires.length };
  },
});

/** "Message all my cAMPers": one thread per selected hire, sharing a broadcast id. */
export const SendManagerBroadcast = api({
  name: "SendManagerBroadcast",
  description: "Sends one manager note to several of their hires",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    camper_ids: z.array(z.number().int().positive()).min(1).max(50),
    sentiment: z.enum(["positive", "encouraging", "feedback", "concerning"]),
    content: z.string().trim().min(1).max(2000),
    visibility: z.enum(["camper", "counselor"]),
  }),
  output: z.object({ sent: z.number() }),
  async run(ctx, input) {
    const db = ctx.integrations.camp_201_db;
    const manager = await requireManager(db, ctx.user.email);
    const broadcastId = `${manager.id}-${Date.now()}`;
    // Only hires linked to this manager are inserted; anything else in camper_ids is ignored.
    const rows = await db.query(
      `INSERT INTO camp201_manager_comments
         (manager_id, camper_id, comment_type, sentiment, content, visibility, manager_read_at, broadcast_id)
       SELECT $1, mh.camper_id, 'comment', $2, $3, $4, NOW(), $5
       FROM camp201_manager_hires mh
       JOIN camp201_campers c ON c.id = mh.camper_id
       WHERE mh.manager_id = $1 AND mh.camper_id = ANY($6::int[]) AND c.removed_at IS NULL
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [manager.id, input.sentiment, input.content, input.visibility, broadcastId, input.camper_ids],
      { label: "Insert broadcast threads" }
    );
    if (rows.length === 0) throw new Error("None of those cAMPers are on your dashboard.");
    return { sent: rows.length };
  },
});
