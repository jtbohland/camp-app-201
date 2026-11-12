import { z } from "@superblocksteam/sdk-api";
import { STANDARD_ROLES, mapToStandardRole } from "./roles.js";

/**
 * Blackout (required) sessions.
 *
 * A counselor marks an agenda tile as required for every role or for selected standard roles.
 * Tiles are stored as day_number + HH:MM in Pacific Time, so real times come from the
 * `camp_start_date` setting (day 1). With no start date set, nothing can be matched yet.
 */

type Db = {
  query: <T>(sql: string, schema: z.ZodType<T>, params?: unknown[], meta?: { label?: string }) => Promise<T[]>;
};

/** jsonb role list as the driver returns it: an array, or JSON text. */
export const RawRoles = z.union([z.array(z.string()), z.string(), z.null()]);

/** Role list from RawRoles → string[]. Bad data = [] (every role). */
export function parseRoles(v: unknown): string[] {
  let parsed: unknown = v;
  if (typeof v === "string") {
    try {
      parsed = JSON.parse(v);
    } catch {
      return [];
    }
  }
  return Array.isArray(parsed) ? parsed.filter((r): r is string => typeof r === "string") : [];
}

const WindowRow = z.object({
  agenda_id: z.coerce.number(),
  title: z.string(),
  day_number: z.coerce.number(),
  start_time: z.string(),
  end_time: z.string(),
  roles: RawRoles,
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
});

export type BlackoutWindow = Omit<z.infer<typeof WindowRow>, "roles"> & { roles: string[] };

export const BlackoutSessionSchema = z.object({
  agenda_id: z.number(),
  title: z.string(),
  day_number: z.number(),
  start_time: z.string(),
  end_time: z.string(),
  roles: z.array(z.string()),
  starts_at: z.string().nullable(),
  ends_at: z.string().nullable(),
});

/** Keeps only real standard roles, in the standard order. Empty = every role. */
export function cleanRoles(roles: readonly string[]): string[] {
  const wanted = new Set(roles);
  return STANDARD_ROLES.filter((r) => wanted.has(r));
}

/** True when a blackout with these roles applies to a cAMPer with this stored role. */
export function appliesToRole(roles: readonly string[], camperRole: string | null | undefined): boolean {
  if (roles.length === 0) return true;
  const mapped = mapToStandardRole(camperRole);
  return mapped !== null && roles.includes(mapped);
}

/** ISO UTC text so every browser can parse it. */
const isoSql = (expr: string) => `to_char((${expr}) AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')`;
const START_DATE_SQL = `(SELECT CASE WHEN btrim(value) ~ '^\\d{4}-\\d{2}-\\d{2}' THEN substring(btrim(value), 1, 10)::date END
                          FROM camp201_config WHERE key = 'camp_start_date' LIMIT 1)`;
const tileTs = (timeCol: string) =>
  `((sd.d + (a.day_number - 1))::timestamp + ${timeCol}::time) AT TIME ZONE 'America/Los_Angeles'`;

/** Every blackout tile on the agenda, with real start/end times when the cAMP start date is set. */
export async function loadBlackoutWindows(db: Db): Promise<{ startDateSet: boolean; windows: BlackoutWindow[] }> {
  const rows = await db.query(
    `WITH sd AS (SELECT ${START_DATE_SQL} AS d)
     SELECT a.id AS agenda_id, a.title, a.day_number, a.start_time, a.end_time,
            COALESCE(a.blackout_roles, '[]'::jsonb) AS roles,
            CASE WHEN sd.d IS NULL THEN NULL ELSE ${isoSql(tileTs("a.start_time"))} END AS starts_at,
            CASE WHEN sd.d IS NULL THEN NULL ELSE ${isoSql(tileTs("a.end_time"))} END AS ends_at
     FROM camp201_agenda a CROSS JOIN sd
     WHERE a.is_blackout = true
     ORDER BY a.day_number, a.start_time
     LIMIT 200`,
    WindowRow,
    undefined,
    { label: "Load blackout sessions" }
  );
  const startDate = await db.query(
    `SELECT (${START_DATE_SQL}) IS NOT NULL AS ok`,
    z.object({ ok: z.boolean() }),
    undefined,
    { label: "Check cAMP start date" }
  );
  return { startDateSet: !!startDate[0]?.ok, windows: rows.map((r) => ({ ...r, roles: parseRoles(r.roles) })) };
}

/** Blackouts for this role that overlap [start, end). Touching edges (ends 9:00, starts 9:00) don't count. */
export function overlappingBlackouts(
  windows: readonly BlackoutWindow[],
  camperRole: string | null | undefined,
  start: Date,
  end: Date
): BlackoutWindow[] {
  return windows.filter((w) => {
    if (!w.starts_at || !w.ends_at || !appliesToRole(w.roles, camperRole)) return false;
    const ws = Date.parse(w.starts_at);
    const we = Date.parse(w.ends_at);
    return start.getTime() < we && end.getTime() > ws;
  });
}

const AbsenceRow = z.object({
  id: z.coerce.number(),
  camper_id: z.coerce.number(),
  camper_name: z.string(),
  camper_role: z.string().nullable(),
  team_name: z.string().nullable(),
  reason: z.string().nullable(),
  start_time: z.string(),
  end_time: z.string(),
  status: z.string(),
  approval_type: z.string(),
  blackout_ack_at: z.string().nullable(),
  withdrawn_at: z.string().nullable(),
});

export const BlackoutConflictSchema = AbsenceRow.omit({ camper_role: true }).extend({
  sessions: z.array(BlackoutSessionSchema),
});
export type BlackoutConflict = z.infer<typeof BlackoutConflictSchema>;

/**
 * Absences in the active cohort that overlap a blackout for that cAMPer's role.
 * Approved ones are open conflicts; withdrawn ones are shown as resolved.
 * camperId = one cAMPer, null = everyone.
 */
export async function findBlackoutConflicts(db: Db, camperId: number | null): Promise<BlackoutConflict[]> {
  const { windows } = await loadBlackoutWindows(db);
  if (!windows.some((w) => w.starts_at)) return [];

  const absences = await db.query(
    `SELECT a.id, a.camper_id, CONCAT(c.first_name, ' ', c.last_name) AS camper_name, c.role AS camper_role,
            t.name AS team_name, a.reason,
            ${isoSql("a.start_time")} AS start_time, ${isoSql("a.end_time")} AS end_time,
            COALESCE(a.status, 'approved') AS status, COALESCE(a.approval_type, 'standard') AS approval_type,
            a.blackout_ack_at::text AS blackout_ack_at, a.withdrawn_at::text AS withdrawn_at
     FROM camp201_absence_requests a
     JOIN camp201_campers c ON c.id = a.camper_id
     JOIN camp201_cohorts co ON co.id = c.cohort_id AND co.is_active = true
     LEFT JOIN camp201_teams t ON t.id = c.team_id
     WHERE c.removed_at IS NULL
       AND (a.cohort_id IS NULL OR a.cohort_id = c.cohort_id)
       AND (COALESCE(a.status, 'approved') = 'approved' OR a.withdrawn_at IS NOT NULL)
       ${camperId !== null ? "AND a.camper_id = $1" : ""}
     ORDER BY a.start_time
     LIMIT 500`,
    AbsenceRow,
    camperId !== null ? [camperId] : undefined,
    { label: "Load absences to check against blackouts" }
  );

  const out: BlackoutConflict[] = [];
  for (const a of absences) {
    const hits = overlappingBlackouts(windows, a.camper_role, new Date(a.start_time), new Date(a.end_time));
    if (hits.length === 0) continue;
    const { camper_role: _role, ...rest } = a;
    out.push({ ...rest, sessions: hits });
  }
  return out;
}
