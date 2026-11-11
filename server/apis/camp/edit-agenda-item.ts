import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const ItemRow = z.object({
  title: z.string().nullable(),
  session_type: z.string().nullable(),
  session_bank_id: z.coerce.number().nullable(),
  bank_description: z.string().nullable(),
  bank_type: z.string().nullable(),
});

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
};

/**
 * Edits one scheduled tile: time, length, and name.
 * A new name becomes a new Session Bank session (or links to an existing one with that exact name).
 * The tile's original Session Bank session is never changed.
 */
export default api({
  name: "EditAgendaItem",
  description: "Edits one agenda tile; new names become new bank sessions",
  integrations: {
    camp_db: postgres(APPS_DB),
  },
  input: z.object({
    id: z.number(),
    start_time: z.string().regex(/^\d{2}:\d{2}$/),
    end_time: z.string().regex(/^\d{2}:\d{2}$/),
    title: z.string().trim().min(1, "Session name is required").max(150),
  }),
  output: z.object({
    success: z.boolean(),
    renamed: z.boolean(),
    /** Set when the new name was added to the Session Bank (false when an existing session matched). */
    created_bank_session: z.boolean(),
    session_bank_id: z.number().nullable(),
  }),
  async run(ctx, { id, start_time, end_time, title }) {
    const db = ctx.integrations.camp_db;
    await requireCounselor(db, ctx.user.email);

    const minutes = toMinutes(end_time) - toMinutes(start_time);
    if (minutes < 5) throw new Error("Session must be at least 5 minutes long.");

    const rows = await db.query(
      `SELECT a.title, a.session_type, a.session_bank_id,
              sb.description AS bank_description, sb.session_type AS bank_type
       FROM camp201_agenda a
       LEFT JOIN camp201_session_bank sb ON sb.id = a.session_bank_id
       WHERE a.id = $1 LIMIT 1`,
      ItemRow,
      [id],
      { label: "Load agenda tile" }
    );
    const item = rows[0];
    if (!item) throw new Error("That session is no longer on the agenda.");

    const newTitle = title.trim();
    const renamed = newTitle !== (item.title ?? "").trim();
    let bankId: number | null = item.session_bank_id;
    let created = false;

    if (renamed) {
      // Reuse a library session that already has this exact name, otherwise add a new one.
      const existing = await db.query(
        `SELECT id FROM camp201_session_bank WHERE lower(btrim(title)) = lower($1) ORDER BY id LIMIT 1`,
        z.object({ id: z.coerce.number() }),
        [newTitle],
        { label: "Find library session with new name" }
      );
      if (existing[0]) {
        bankId = existing[0].id;
      } else {
        const inserted = await db.query(
          `INSERT INTO camp201_session_bank (title, description, duration_minutes, session_type, created_by)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          z.object({ id: z.coerce.number() }),
          [
            newTitle,
            item.bank_description ?? "",
            Math.min(480, minutes),
            item.bank_type || item.session_type || "session",
            ctx.user.email ?? "",
          ],
          { label: "Add renamed session to library" }
        );
        bankId = inserted[0].id;
        created = true;
      }
    }

    await db.execute(
      `UPDATE camp201_agenda
       SET start_time = $2, end_time = $3, title = $4, session_bank_id = $5
       WHERE id = $1`,
      [id, start_time, end_time, newTitle, bankId],
      { label: "Update agenda tile" }
    );

    return { success: true, renamed, created_bank_session: created, session_bank_id: bankId };
  },
});
