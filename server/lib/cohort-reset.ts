/**
 * Resets app-wide camp state so a new cohort starts fresh.
 * Program content (agenda, activities, Journey, session bank, settings) carries over untouched.
 */

// Sections open on day one of a new cohort. Everything else starts locked.
const OPEN_ON_START = ["journey", "agenda", "surveys", "badges", "leaderboard"];

export async function resetCampStateForNewCohort(
  db: any,
  newCohortId: number,
  startDate: string | null
): Promise<void> {
  const resetValues: Record<string, string> = {
    camp_closed: "false",
    camp_closed_at: "",
    camp_closed_by: "",
    camp_ready_to_close: "false",
    camp_start_date: startDate ?? "",
    camp_vp_camper_id: "",
    camp_champ_team_id: "",
    revealed_team_ids: "[]",
    vp_revealed: "false",
    final_survey_unlocked: "false",
    active_presentation_order: "{}",
  };
  const keys = Object.keys(resetValues);
  const values = keys.map((k) => resetValues[k]);

  await db.execute(
    `INSERT INTO camp201_config (key, value, updated_at)
     SELECT k, v, NOW() FROM unnest($1::text[], $2::text[]) AS t(k, v)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [keys, values],
    { label: "Reset camp flags" }
  );

  await db.execute(
    `UPDATE camp201_config SET value = 'false', updated_at = NOW()
     WHERE key LIKE 'survey\\_day\\_%\\_locked' OR key LIKE 'agenda\\_day\\_%\\_locked'`,
    undefined,
    { label: "Unlock all survey + agenda days" }
  );

  await db.execute(
    `UPDATE camp201_feature_gates
     SET is_locked = NOT (feature_key = ANY($1::text[])),
         unlock_at = NULL, updated_by = 'new cohort', updated_at = NOW()`,
    [OPEN_ON_START],
    { label: "Reset section locks to defaults" }
  );

  await db.execute(
    `UPDATE camp201_presentations
     SET is_locked = true, scores_revealed = false`,
    undefined,
    { label: "Re-lock activities" }
  );

  // Counselors carry over to the new cohort so they appear in rotation and Mini EBR scoring.
  await db.execute(
    `UPDATE camp201_campers SET cohort_id = $1, updated_at = NOW()
     WHERE role IN ('counselor', 'admin')`,
    [newCohortId],
    { label: "Move counselors to new cohort" }
  );
}
