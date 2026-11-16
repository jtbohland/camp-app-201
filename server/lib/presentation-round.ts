import { z } from "@superblocksteam/sdk-api";

/** Round state for one cohort: which presentation is running, and the teams picked for each one (in order). */
export type RoundState = {
  active_presentation_id: number | null;
  picks: Record<string, number[]>;
  last_pick_at: string | null;
};

export const EMPTY_ROUND: RoundState = { active_presentation_id: null, picks: {}, last_pick_at: null };

export const roundKey = (cohortId: number) => `presentation_round_cohort_${Math.trunc(cohortId)}`;

export const TEAM_SESSION_TYPES = ["team_presentation", "team_workshop", "hackathon"];

function parseRound(raw: string | null | undefined): RoundState {
  if (!raw) return { ...EMPTY_ROUND, picks: {} };
  try {
    const p = JSON.parse(raw) as Partial<RoundState>;
    return {
      active_presentation_id: typeof p.active_presentation_id === "number" ? p.active_presentation_id : null,
      picks: p.picks && typeof p.picks === "object" ? (p.picks as Record<string, number[]>) : {},
      last_pick_at: typeof p.last_pick_at === "string" ? p.last_pick_at : null,
    };
  } catch {
    return { ...EMPTY_ROUND, picks: {} };
  }
}

/** Reads the round state plus the raw stored text (used to detect a concurrent change on save). */
export async function loadRound(db: any, cohortId: number): Promise<{ state: RoundState; raw: string | null }> {
  const rows = await db.query(
    `SELECT value FROM camp201_config WHERE key = $1 LIMIT 1`,
    z.object({ value: z.string().nullable() }),
    [roundKey(cohortId)],
    { label: "Load presentation round" }
  );
  const raw = rows[0]?.value ?? null;
  return { state: parseRound(raw), raw };
}

/**
 * Saves the new state only if nobody changed it since `prevRaw` was read.
 * Returns false when someone else saved first (caller tells the user to try again).
 */
export async function saveRound(db: any, cohortId: number, prevRaw: string | null, next: RoundState): Promise<boolean> {
  const value = JSON.stringify(next);
  const Count = z.object({ n: z.coerce.number() });
  if (prevRaw === null) {
    const rows = await db.query(
      `WITH ins AS (
         INSERT INTO camp201_config (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO NOTHING RETURNING key
       ) SELECT COUNT(*)::int AS n FROM ins`,
      Count,
      [roundKey(cohortId), value],
      { label: "Create presentation round" }
    );
    return (rows[0]?.n ?? 0) > 0;
  }
  const rows = await db.query(
    `WITH upd AS (
       UPDATE camp201_config SET value = $2, updated_at = NOW() WHERE key = $1 AND value = $3 RETURNING key
     ) SELECT COUNT(*)::int AS n FROM upd`,
    Count,
    [roundKey(cohortId), value, prevRaw],
    { label: "Save presentation round" }
  );
  return (rows[0]?.n ?? 0) > 0;
}

export const RoundTeamSchema = z.object({
  id: z.coerce.number(),
  name: z.string(),
  logo_url: z.string().nullable(),
  color: z.string().nullable(),
});
export type RoundTeam = z.infer<typeof RoundTeamSchema>;

/** Live cohort teams that present: not the TEST team, and with at least one cAMPer on them. */
export async function loadPresentingTeams(db: any, cohortId: number): Promise<RoundTeam[]> {
  return db.query(
    `SELECT t.id, t.name, t.logo_url, t.color
     FROM camp201_teams t
     WHERE t.cohort_id = $1
       AND upper(btrim(t.name)) <> 'TEST'
       AND EXISTS (SELECT 1 FROM camp201_campers c
                   WHERE c.team_id = t.id AND c.removed_at IS NULL
                     AND COALESCE(c.role, '') NOT IN ('counselor', 'admin'))
     ORDER BY t.name
     LIMIT 50`,
    RoundTeamSchema,
    [cohortId],
    { label: "Load presenting teams" }
  );
}

export const RoundPresentationSchema = z.object({
  id: z.coerce.number(),
  title: z.string(),
  presentation_type: z.string(),
  day_number: z.coerce.number().nullable(),
  rubric_template_id: z.coerce.number().nullable(),
});
export type RoundPresentation = z.infer<typeof RoundPresentationSchema>;

/** Team sessions a counselor can run a presenting round for. */
export async function loadRoundPresentations(db: any): Promise<RoundPresentation[]> {
  return db.query(
    `SELECT id, title, presentation_type, day_number, rubric_template_id
     FROM camp201_presentations
     WHERE presentation_type = ANY($1::text[])
     ORDER BY day_number NULLS LAST, sort_order NULLS LAST, id
     LIMIT 50`,
    RoundPresentationSchema,
    [TEAM_SESSION_TYPES],
    { label: "Load presentations for rounds" }
  );
}
