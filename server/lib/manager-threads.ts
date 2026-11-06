import { z } from "@superblocksteam/sdk-api";
import { getCounselorAccess } from "./cohort.js";

/**
 * Manager <-> cAMPer <-> counselor conversations.
 *
 * Each row in camp201_manager_comments is the start of a thread. `visibility` decides the audience:
 *   'camper'    -> the cAMPer sees it and can reply or acknowledge (counselors can always read it)
 *   'counselor' -> only the manager and counselors; never returned to the cAMPer
 * Every identity here comes from the server-verified ctx.user.email, never from API input.
 */

export type ThreadRole = "camper" | "manager" | "counselor";
export type Visibility = "camper" | "counselor";

const IdSchema = z.object({ id: z.coerce.number() });

function norm(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/** The signed-in manager, or throws. */
export async function requireManager(db: any, email: string | null | undefined): Promise<{ id: number; name: string }> {
  const e = norm(email);
  if (!e) throw new Error("You must be signed in.");
  const rows = await db.query(
    `SELECT id, (first_name || ' ' || last_name) AS name FROM camp201_managers WHERE lower(email) = $1 LIMIT 1`,
    z.object({ id: z.coerce.number(), name: z.string() }),
    [e],
    { label: "Find signed-in manager" }
  );
  if (rows.length === 0) throw new Error("Register in the Manager Portal first.");
  return rows[0];
}

/** The signed-in cAMPer (latest, not removed), or null. */
export async function findCamper(db: any, email: string | null | undefined): Promise<{ id: number; name: string } | null> {
  const e = norm(email);
  if (!e) return null;
  const rows = await db.query(
    `SELECT id, (first_name || ' ' || last_name) AS name FROM camp201_campers
     WHERE lower(email) = $1 AND removed_at IS NULL ORDER BY id DESC LIMIT 1`,
    z.object({ id: z.coerce.number(), name: z.string() }),
    [e],
    { label: "Find signed-in cAMPer" }
  );
  return rows[0] ?? null;
}

/** The signed-in counselor's display name, or throws if they aren't a counselor. */
export async function requireCounselorName(db: any, email: string | null | undefined, fallbackName?: string): Promise<string> {
  const e = norm(email);
  if (!e) throw new Error("You must be signed in.");
  const access = await getCounselorAccess(db, e);
  if (!access.isAdmin) throw new Error("Only counselors can do this.");
  const rows = await db.query(
    `SELECT (first_name || ' ' || last_name) AS name FROM camp201_campers
     WHERE lower(email) = $1 ORDER BY id DESC LIMIT 1`,
    z.object({ name: z.string() }),
    [e],
    { label: "Counselor display name" }
  );
  return rows[0]?.name?.trim() || fallbackName || e;
}

/** SQL (alias `mc`): this thread has something the given party hasn't seen yet. Constant strings only. */
export function unreadSql(role: ThreadRole): string {
  const newerReply = (readCol: string) => `EXISTS (SELECT 1 FROM camp201_manager_comment_replies r
      WHERE r.comment_id = mc.id AND r.author_type <> '${role}' AND r.created_at > ${readCol})`;
  if (role === "camper") {
    return `(mc.visibility = 'camper' AND (mc.camper_read_at IS NULL OR ${newerReply("mc.camper_read_at")}))`;
  }
  if (role === "counselor") {
    // Counselors are alerted for notes meant for them; cAMPer-facing threads stay readable on the report card.
    return `(mc.visibility = 'counselor' AND (mc.counselor_read_at IS NULL OR ${newerReply("mc.counselor_read_at")}))`;
  }
  const seen = "COALESCE(mc.manager_read_at, mc.created_at)";
  return `(${newerReply(seen)} OR (mc.acknowledged_at IS NOT NULL AND mc.acknowledged_at > ${seen}))`;
}

export const ReplySchema = z.object({
  id: z.coerce.number(),
  comment_id: z.coerce.number(),
  author_type: z.string(),
  author_name: z.string(),
  content: z.string(),
  created_at: z.string(),
});
export type Reply = z.infer<typeof ReplySchema>;

export const ThreadRowSchema = z.object({
  id: z.coerce.number(),
  camper_id: z.coerce.number(),
  camper_name: z.string(),
  manager_name: z.string(),
  comment_type: z.string(),
  sentiment: z.string(),
  content: z.string(),
  visibility: z.string(),
  created_at: z.string(),
  acknowledged_at: z.string().nullable(),
  unread: z.boolean(),
});

/** Output shape shared by every thread API. */
export const ThreadSchema = ThreadRowSchema.extend({
  replies: z.array(ReplySchema.omit({ comment_id: true })),
});
export type Thread = z.infer<typeof ThreadSchema>;

/** SELECT list + joins for thread rows (alias mc). `role` picks which unread flag to compute. */
export function threadSelectSql(role: ThreadRole): string {
  return `SELECT mc.id, mc.camper_id,
            (c.first_name || ' ' || c.last_name) AS camper_name,
            (m.first_name || ' ' || m.last_name) AS manager_name,
            mc.comment_type, mc.sentiment, mc.content, mc.visibility,
            mc.created_at::text, mc.acknowledged_at::text,
            ${unreadSql(role)} AS unread
          FROM camp201_manager_comments mc
          JOIN camp201_managers m ON m.id = mc.manager_id
          JOIN camp201_campers c ON c.id = mc.camper_id`;
}

/** Attach replies (oldest first) to thread rows with one query. */
export async function withReplies(db: any, rows: z.infer<typeof ThreadRowSchema>[]): Promise<Thread[]> {
  if (rows.length === 0) return [];
  const replies: Reply[] = await db.query(
    `SELECT id, comment_id, author_type, author_name, content, created_at::text
     FROM camp201_manager_comment_replies
     WHERE comment_id = ANY($1::int[])
     ORDER BY created_at ASC
     LIMIT 1000`,
    ReplySchema,
    [rows.map((r) => r.id)],
    { label: "Load thread replies" }
  );
  const byThread = new Map<number, Thread["replies"]>();
  for (const r of replies) {
    const list = byThread.get(r.comment_id) ?? [];
    list.push({ id: r.id, author_type: r.author_type, author_name: r.author_name, content: r.content, created_at: r.created_at });
    byThread.set(r.comment_id, list);
  }
  return rows.map((row) => ({ ...row, replies: byThread.get(row.id) ?? [] }));
}

/** Column storing when each party last read a thread. */
export const READ_COLUMN: Record<ThreadRole, string> = {
  camper: "camper_read_at",
  manager: "manager_read_at",
  counselor: "counselor_read_at",
};

/**
 * Ids (from `ids`) of threads the signed-in user may act on as `role`. Anything else is dropped.
 * camper: their own cAMPer-visible threads. manager: threads they wrote. counselor: any thread.
 */
export async function allowedThreadIds(
  db: any,
  role: ThreadRole,
  email: string | null | undefined,
  ids: number[],
): Promise<{ ids: number[]; authorName: string }> {
  const clean = [...new Set(ids.map((n) => Math.trunc(Number(n))).filter((n) => n > 0))];
  if (clean.length === 0) return { ids: [], authorName: "" };

  if (role === "counselor") {
    const name = await requireCounselorName(db, email);
    const rows = await db.query(
      `SELECT id FROM camp201_manager_comments WHERE id = ANY($1::int[]) LIMIT 500`,
      IdSchema, [clean], { label: "Check threads exist" }
    );
    return { ids: rows.map((r: { id: number }) => r.id), authorName: name };
  }
  if (role === "manager") {
    const me = await requireManager(db, email);
    const rows = await db.query(
      `SELECT id FROM camp201_manager_comments WHERE id = ANY($1::int[]) AND manager_id = $2 LIMIT 500`,
      IdSchema, [clean, me.id], { label: "Check manager owns threads" }
    );
    return { ids: rows.map((r: { id: number }) => r.id), authorName: me.name };
  }
  const camper = await findCamper(db, email);
  if (!camper) throw new Error("cAMPer account not found.");
  const rows = await db.query(
    `SELECT id FROM camp201_manager_comments
     WHERE id = ANY($1::int[]) AND camper_id = $2 AND visibility = 'camper' LIMIT 500`,
    IdSchema, [clean, camper.id], { label: "Check cAMPer owns threads" }
  );
  return { ids: rows.map((r: { id: number }) => r.id), authorName: camper.name };
}
