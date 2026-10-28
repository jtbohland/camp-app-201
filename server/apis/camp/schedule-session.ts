import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

const TIME = z.string().regex(/^\d{1,2}:\d{2}$/, "Time must be HH:MM");

export default api({
  name: "ScheduleSession",
  description: "Places a session onto the agenda at a specific day and time",
  integrations: {
    camp_201_db: postgres(APPS_DB),
  },
  input: z.object({
    session_bank_id: z.number().nullable(),
    day_number: z.number(),
    start_time: TIME,
    end_time: TIME,
    title: z.string(),
    session_type: z.string(),
  }),
  output: z.object({
    id: z.coerce.number(),
    success: z.boolean(),
  }),
  async run(ctx, { session_bank_id, day_number, start_time, end_time, title, session_type }) {
    const db = ctx.integrations.camp_201_db;

    // Use the Session Bank's saved title/type so built-in and custom sessions behave the same.
    let finalTitle = title.trim();
    let finalType = session_type.trim();
    if (session_bank_id !== null) {
      const bank = await db.query(
        `SELECT title, session_type FROM camp201_session_bank WHERE id = $1 LIMIT 1`,
        z.object({ title: z.string().nullable(), session_type: z.string().nullable() }),
        [session_bank_id],
        { label: "Look up Session Bank entry" }
      );
      if (bank.length === 0) {
        throw new Error("That session is no longer in the Session Bank. Refresh and try again.");
      }
      finalTitle = (bank[0].title ?? "").trim() || finalTitle;
      finalType = (bank[0].session_type ?? "").trim() || finalType;
    }

    const result = await db.query(
      `INSERT INTO camp201_agenda (session_bank_id, day_number, start_time, end_time, title, session_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [session_bank_id, day_number, start_time, end_time, finalTitle || "Untitled session", finalType || "session"],
      { label: "Schedule session on agenda" }
    );

    return { id: result[0].id, success: true };
  },
});
