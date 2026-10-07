import { z } from "@superblocksteam/sdk-api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type LegacyArchiveResult = {
  archived: boolean;
  cohort_number: number | null;
  teams_archived: number;
  members_archived: number;
  message: string;
};

/**
 * Copies the cohort's final teams, standings, and members onto the Legacy Wall
 * (camp201_past_cohorts / _teams / _members). Safe to call more than once:
 * a config marker records which cohort was already archived.
 */
export async function archiveCohortToLegacyWall(
  db: any,
  cohortId: number,
  champTeamId: number | null,
  dryRun = false
): Promise<LegacyArchiveResult> {
  const markerKey = `legacy_archived_cohort_${cohortId}`;
  const marker = await db.query(
    `SELECT value FROM camp201_config WHERE key = $1 LIMIT 1`,
    z.object({ value: z.string() }),
    [markerKey],
    { label: "Check Legacy Wall marker" }
  );
  if (marker.length > 0 && marker[0].value) {
    return {
      archived: false,
      cohort_number: Number(marker[0].value) || null,
      teams_archived: 0,
      members_archived: 0,
      message: "Already on the Legacy Wall.",
    };
  }

  const teams = await db.query(
    `SELECT t.id, t.name, COALESCE(t.logo_url, '') AS logo_url,
            t.assigned_company->>'name' AS company,
            COALESCE(SUM(c.points), 0) + COALESCE(t.team_points, 0) AS total
     FROM camp201_teams t
     LEFT JOIN camp201_campers c ON c.team_id = t.id AND c.role NOT IN ('counselor', 'admin')
     WHERE t.cohort_id = $1 AND t.name <> 'TEST'
     GROUP BY t.id, t.name, t.logo_url, t.assigned_company, t.team_points
     ORDER BY total DESC, t.name
     LIMIT 20`,
    z.object({
      id: z.coerce.number(),
      name: z.string(),
      logo_url: z.string(),
      company: z.string().nullable(),
      total: z.coerce.number(),
    }),
    [cohortId],
    { label: "Final team standings" }
  );
  if (teams.length === 0) {
    return { archived: false, cohort_number: null, teams_archived: 0, members_archived: 0, message: "No teams to archive." };
  }

  const cohortInfo = await db.query(
    `SELECT start_date::text AS start_date FROM camp201_cohorts WHERE id = $1 LIMIT 1`,
    z.object({ start_date: z.string().nullable() }),
    [cohortId],
    { label: "Cohort dates" }
  );
  const when = cohortInfo[0]?.start_date ? new Date(`${cohortInfo[0].start_date}T12:00:00Z`) : new Date();
  const month = MONTHS[when.getUTCMonth()];
  const year = when.getUTCFullYear();

  const nextNumber = await db.query(
    `SELECT COALESCE(MAX(cohort_number), 0) + 1 AS n FROM camp201_past_cohorts`,
    z.object({ n: z.coerce.number() }),
    undefined,
    { label: "Next cohort number" }
  );
  const cohortNumber = nextNumber[0].n;
  const hasLogos = teams.some((t: { logo_url: string }) => t.logo_url.trim() !== "");

  // Preview: report what would be saved without writing anything.
  if (dryRun) {
    const memberCount = await db.query(
      `SELECT COUNT(*)::int AS n FROM camp201_campers
       WHERE team_id = ANY($1::int[]) AND role NOT IN ('counselor', 'admin')`,
      z.object({ n: z.coerce.number() }),
      [teams.map((t: { id: number }) => t.id)],
      { label: "Count members to archive" }
    );
    return {
      archived: false,
      cohort_number: cohortNumber,
      teams_archived: teams.length,
      members_archived: memberCount[0]?.n ?? 0,
      message: `Will be saved as cAMP #${cohortNumber} (${month} ${year}).`,
    };
  }

  const pastCohort = await db.query(
    `INSERT INTO camp201_past_cohorts
       (cohort_number, date_label, month, year, num_teams, has_team_names, has_logos, has_points)
     VALUES ($1, $2, $3, $4, $5, true, $6, true)
     RETURNING id`,
    z.object({ id: z.coerce.number() }),
    [cohortNumber, `${month} ${year}`, month, year, teams.length, hasLogos],
    { label: "Add cohort to Legacy Wall" }
  );
  const pastCohortId = pastCohort[0].id;
  const winnerId = champTeamId ?? teams[0].id;

  let membersArchived = 0;
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];
    const pastTeam = await db.query(
      `INSERT INTO camp201_past_teams
         (cohort_id, team_name, logo_url, points, place, is_winner, presentation_company)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [pastCohortId, team.name, team.logo_url || null, team.total, i + 1, team.id === winnerId, team.company],
      { label: `Archive team ${team.name}` }
    );
    const result = await db.execute(
      `INSERT INTO camp201_past_members (team_id, full_name, role, region)
       SELECT $1, TRIM(CONCAT(first_name, ' ', last_name)), NULLIF(role, ''), NULLIF(region, '')
       FROM camp201_campers
       WHERE team_id = $2 AND role NOT IN ('counselor', 'admin')
       ORDER BY first_name, last_name`,
      [pastTeam[0].id, team.id],
      { label: `Archive members of ${team.name}` }
    );
    membersArchived += result.rowCount ?? 0;
  }

  await db.execute(
    `INSERT INTO camp201_config (key, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [markerKey, String(cohortNumber)],
    { label: "Mark cohort archived" }
  );

  return {
    archived: true,
    cohort_number: cohortNumber,
    teams_archived: teams.length,
    members_archived: membersArchived,
    message: `Added to the Legacy Wall as cAMP #${cohortNumber}.`,
  };
}
