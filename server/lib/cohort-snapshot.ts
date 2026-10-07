import { z } from "@superblocksteam/sdk-api";
import type { CohortView } from "./cohort.js";

/**
 * A cohort's final state, saved once when it closes (or when the next cohort starts).
 * Past-cohort views read points, standings, winners, and counselors from here so they
 * can't drift after the cohort ends.
 */
export type SnapshotPerson = {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  points: number;
  team_id: number | null;
  photo_url: string | null;
  is_counselor: boolean;
};

export type SnapshotTeam = {
  id: number;
  name: string;
  logo_url: string | null;
  color: string | null;
  team_points: number;
  assigned_company: unknown;
};

export type CohortSnapshot = {
  taken_at: string;
  people: SnapshotPerson[];
  teams: SnapshotTeam[];
  counselor_ids: number[];
  camp_vp_camper_id: number | null;
  camp_champ_team_id: number | null;
  final_survey_unlocked: boolean;
  camp_closed_at: string | null;
};

const PersonRow = z.object({
  id: z.coerce.number(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  email: z.string().nullable(),
  points: z.coerce.number().nullable(),
  team_id: z.coerce.number().nullable(),
  photo_url: z.string().nullable(),
  is_counselor: z.boolean().nullable(),
});

const TeamRow = z.object({
  id: z.coerce.number(),
  name: z.string(),
  logo_url: z.string().nullable(),
  color: z.string().nullable(),
  team_points: z.coerce.number().nullable(),
  assigned_company: z.any().nullable(),
});

async function readLivePeople(db: any, cohortId: number): Promise<SnapshotPerson[]> {
  const rows = await db.query(
    `SELECT id, first_name, last_name, email, points, team_id, photo_url,
            (role IN ('counselor', 'admin')) AS is_counselor
     FROM camp201_campers WHERE cohort_id = $1
     ORDER BY points DESC, first_name LIMIT 500`,
    PersonRow,
    [cohortId],
    { label: "Read cohort people" }
  );
  return rows.map((r: z.infer<typeof PersonRow>) => ({
    id: r.id,
    first_name: r.first_name ?? "",
    last_name: r.last_name ?? "",
    email: r.email ?? "",
    points: r.points ?? 0,
    team_id: r.team_id,
    photo_url: r.photo_url,
    is_counselor: r.is_counselor === true,
  }));
}

async function readLiveTeams(db: any, cohortId: number): Promise<SnapshotTeam[]> {
  const rows = await db.query(
    `SELECT id, name, logo_url, color, team_points, assigned_company
     FROM camp201_teams WHERE cohort_id = $1 ORDER BY name LIMIT 50`,
    TeamRow,
    [cohortId],
    { label: "Read cohort teams" }
  );
  return rows.map((t: z.infer<typeof TeamRow>) => ({ ...t, team_points: t.team_points ?? 0 }));
}

async function readConfig(db: any, key: string): Promise<string | null> {
  const rows = await db.query(
    `SELECT value FROM camp201_config WHERE key = $1 LIMIT 1`,
    z.object({ value: z.string().nullable() }),
    [key],
    { label: `Read ${key}` }
  );
  return rows[0]?.value ?? null;
}

const toId = (v: string | null) => {
  const n = v ? parseInt(v, 10) : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * Saves the cohort's final state. Keeps the first snapshot if one already exists,
 * so a later call can never replace the as-of-close numbers.
 */
export async function saveCohortSnapshot(db: any, cohortId: number): Promise<boolean> {
  const people = await readLivePeople(db, cohortId);
  const teams = await readLiveTeams(db, cohortId);
  const snapshot: CohortSnapshot = {
    taken_at: new Date().toISOString(),
    people,
    teams,
    counselor_ids: people.filter((p) => p.is_counselor).map((p) => p.id),
    camp_vp_camper_id: toId(await readConfig(db, "camp_vp_camper_id")),
    camp_champ_team_id: toId(await readConfig(db, "camp_champ_team_id")),
    final_survey_unlocked: (await readConfig(db, "final_survey_unlocked")) === "true",
    camp_closed_at: (await readConfig(db, "camp_closed_at")) || null,
  };
  const inserted = await db.query(
    `WITH ins AS (
       INSERT INTO camp201_cohort_snapshots (cohort_id, data) VALUES ($1, $2::jsonb)
       ON CONFLICT (cohort_id) DO NOTHING
       RETURNING cohort_id
     ) SELECT COUNT(*)::int AS n FROM ins`,
    z.object({ n: z.coerce.number() }),
    [cohortId, JSON.stringify(snapshot)],
    { label: "Save cohort snapshot" }
  );
  return (inserted[0]?.n ?? 0) > 0;
}

export async function getCohortSnapshot(db: any, cohortId: number | null): Promise<CohortSnapshot | null> {
  if (cohortId === null) return null;
  const rows = await db.query(
    `SELECT data FROM camp201_cohort_snapshots WHERE cohort_id = $1 LIMIT 1`,
    z.object({ data: z.any() }),
    [cohortId],
    { label: "Read cohort snapshot" }
  );
  if (rows.length === 0) return null;
  const data = typeof rows[0].data === "string" ? JSON.parse(rows[0].data) : rows[0].data;
  return data as CohortSnapshot;
}

export type StandingTeam = SnapshotTeam & { total_points: number; member_count: number };

export type Standings = {
  /** Everyone in the cohort, counselors included (flagged). Sorted by points. */
  people: SnapshotPerson[];
  /** Non-counselors only, sorted by points. */
  campers: SnapshotPerson[];
  /** Teams sorted by total (member points + team points). */
  teams: StandingTeam[];
  /** Set when numbers come from the as-of-close snapshot. */
  snapshot: CohortSnapshot | null;
};

/**
 * Points and team standings for the cohort being viewed. Past cohorts use the saved
 * snapshot when there is one; the active cohort always uses live data.
 */
export async function getStandings(db: any, view: CohortView): Promise<Standings> {
  if (view.cohortId === null) return { people: [], campers: [], teams: [], snapshot: null };
  const snapshot = view.isPast ? await getCohortSnapshot(db, view.cohortId) : null;
  const people = snapshot ? snapshot.people : await readLivePeople(db, view.cohortId);
  const teamsRaw = snapshot ? snapshot.teams : await readLiveTeams(db, view.cohortId);

  const sortedPeople = [...people].sort((a, b) => b.points - a.points || a.first_name.localeCompare(b.first_name));
  const campers = sortedPeople.filter((p) => !p.is_counselor);
  const teams = teamsRaw
    .map((t) => {
      const members = campers.filter((c) => c.team_id === t.id);
      return {
        ...t,
        total_points: members.reduce((s, m) => s + m.points, 0) + (t.team_points ?? 0),
        member_count: members.length,
      };
    })
    .sort((a, b) => b.total_points - a.total_points || a.name.localeCompare(b.name));

  return { people: sortedPeople, campers, teams, snapshot };
}
