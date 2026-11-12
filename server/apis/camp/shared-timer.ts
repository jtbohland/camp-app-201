import { api, z, postgres } from "@superblocksteam/sdk-api";
import { requireCounselor } from "../../lib/cohort.js";

const APPS_DB = "2fbe75bd-6389-4f20-902d-ceafeb17ad54";

/** One shared session timer: counselors run it, everyone sees the same countdown. */
const TimerSchema = z.object({
  label: z.string(),
  total_seconds: z.coerce.number(),
  remaining_seconds: z.coerce.number(),
  running: z.boolean(),
  /** When a running timer hits 0 (ISO), so every screen counts down to the same moment. */
  ends_at: z.string().nullable(),
  server_now: z.string(),
});

const SELECT_TIMER = `
  SELECT label, total_seconds,
         CASE WHEN running AND ends_at IS NOT NULL
              THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (ends_at - NOW()))))::int
              ELSE remaining_seconds END AS remaining_seconds,
         (running AND ends_at IS NOT NULL AND ends_at > NOW()) AS running,
         CASE WHEN running AND ends_at IS NOT NULL
              THEN to_char(ends_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') END AS ends_at,
         to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS server_now
  FROM camp201_shared_timer WHERE id = 1`;

const IDLE = { label: "", total_seconds: 600, remaining_seconds: 600, running: false, ends_at: null };

async function readTimer(db: any) {
  const rows = await db.query(SELECT_TIMER, TimerSchema, undefined, { label: "Read shared timer" });
  return rows[0] ?? { ...IDLE, server_now: new Date().toISOString() };
}

export const GetSharedTimer = api({
  name: "GetSharedTimer",
  description: "Reads the shared session timer everyone sees",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({}),
  output: TimerSchema,
  async run(ctx) {
    return readTimer(ctx.integrations.camp_201_db);
  },
});

export const UpdateSharedTimer = api({
  name: "UpdateSharedTimer",
  description: "Counselors start, pause, reset or set the shared timer",
  integrations: { camp_201_db: postgres(APPS_DB) },
  input: z.object({
    action: z.enum(["start", "pause", "reset", "set"]),
    /** For "set": the new length in seconds. */
    seconds: z.number().int().min(1).max(24 * 3600).nullable(),
    label: z.string().trim().max(120).nullable(),
  }),
  output: TimerSchema,
  async run(ctx, { action, seconds, label }) {
    const db = ctx.integrations.camp_201_db;
    await requireCounselor(db, ctx.user.email);
    const by = ctx.user.email ?? "";
    await db.execute(`INSERT INTO camp201_shared_timer (id) VALUES (1) ON CONFLICT (id) DO NOTHING`, undefined, {
      label: "Ensure timer row",
    });

    if (action === "start") {
      // Resume from where it is; if it already ran out, restart from the full length.
      await db.execute(
        `UPDATE camp201_shared_timer SET
           remaining_seconds = CASE WHEN remaining_seconds <= 0 THEN total_seconds ELSE remaining_seconds END,
           ends_at = NOW() + make_interval(secs => CASE WHEN remaining_seconds <= 0 THEN total_seconds ELSE remaining_seconds END),
           running = true, label = COALESCE($1, label), updated_by = $2, updated_at = NOW()
         WHERE id = 1 AND NOT (running AND ends_at > NOW())`,
        [label, by],
        { label: "Start shared timer" }
      );
    } else if (action === "pause") {
      await db.execute(
        `UPDATE camp201_shared_timer SET
           remaining_seconds = GREATEST(0, CEIL(EXTRACT(EPOCH FROM (ends_at - NOW()))))::int,
           ends_at = NULL, running = false, updated_by = $1, updated_at = NOW()
         WHERE id = 1 AND running AND ends_at IS NOT NULL`,
        [by],
        { label: "Pause shared timer" }
      );
    } else if (action === "reset") {
      await db.execute(
        `UPDATE camp201_shared_timer SET remaining_seconds = total_seconds, ends_at = NULL, running = false,
           updated_by = $1, updated_at = NOW() WHERE id = 1`,
        [by],
        { label: "Reset shared timer" }
      );
    } else {
      if (!seconds) throw new Error("Pick a timer length.");
      await db.execute(
        `UPDATE camp201_shared_timer SET total_seconds = $1, remaining_seconds = $1, ends_at = NULL, running = false,
           label = COALESCE($2, label), updated_by = $3, updated_at = NOW() WHERE id = 1`,
        [seconds, label, by],
        { label: "Set shared timer length" }
      );
    }
    return readTimer(db);
  },
});
