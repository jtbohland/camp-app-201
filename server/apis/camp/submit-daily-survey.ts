import { api, z, postgres } from "@superblocksteam/sdk-api";
import { getSurveyPoints, BADGE_IDS } from "../../lib/accelerator.js";
import { awardRepeatableBadge } from "../../lib/award-badge.js";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";
const LATE_PENALTY = -3;
const TEAM_RACE_REWARDS = [5, 3, 1, 0]; // 1st=+5, 2nd=+3, 3rd=+1, 4th+=0 (flat to team_points)

export default api({
  name: "SubmitDailySurvey",
  description: "Submits a daily survey with deadline enforcement and team race logic",
  integrations: {
    apps_database: postgres(APPS_DB),
  },
  input: z.object({
    camper_id: z.number(),
    day_number: z.number(),
    session_ratings: z.array(z.object({
      agenda_item_id: z.number(),
      session_title: z.string(),
      session_type: z.string(),
      rating: z.number().min(1).max(5),
      usefulness: z.number().min(1).max(5),
      comment: z.string().nullable(),
    })),
    open_responses: z.array(z.object({ key: z.string(), response: z.string() })),
    overall_ratings: z.array(z.object({ aspect_key: z.string(), rating: z.number().min(1).max(5) })).nullable(),
    overall_open_responses: z.array(z.object({ key: z.string(), response: z.string() })).nullable(),
  }),
  output: z.object({
    success: z.boolean(),
    points_awarded: z.number(),
    on_time: z.boolean(),
    late: z.boolean(),
    locked: z.boolean(),
    team_race_bonus: z.number(),
  }),
  async run(ctx, input) {
    const cohortFilter = `(SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1)`;
    const CohortSchema = z.object({ id: z.coerce.number() });
    const ConfigSchema = z.object({ value: z.string() });

    const cohorts = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_cohorts WHERE is_active = true LIMIT 1`,
      CohortSchema, undefined, { label: "Get active cohort" }
    );
    const cohortId = cohorts.length > 0 ? cohorts[0].id : null;

    // Check duplicate
    const existing = await ctx.integrations.apps_database.query(
      `SELECT id FROM camp201_daily_survey_submissions
       WHERE camper_id = $1 AND day_number = $2 AND cohort_id = $3 LIMIT 1`,
      z.object({ id: z.coerce.number() }),
      [input.camper_id, input.day_number, cohortId],
      { label: "Check duplicate" }
    );
    if (existing.length > 0) {
      return { success: false, points_awarded: 0, on_time: false, late: false, locked: false, team_race_bonus: 0 };
    }

    // Compute deadline + grace
    const startDateRows = await ctx.integrations.apps_database.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_start_date' LIMIT 1`,
      ConfigSchema, undefined, { label: "Get camp start date" }
    );

    let onTime = true;
    let late = false;
    let locked = false;
    const now = new Date();

    if (startDateRows.length > 0 && startDateRows[0].value) {
      const startDate = new Date(startDateRows[0].value + "T00:00:00-07:00");
      const deadline = new Date(startDate);
      deadline.setDate(deadline.getDate() + input.day_number);
      deadline.setHours(9, 0, 0, 0);

      const grace = new Date(deadline);
      grace.setHours(10, 0, 0, 0);

      if (now > grace) {
        // Past grace period — locked, can't submit
        return { success: false, points_awarded: 0, on_time: false, late: true, locked: true, team_race_bonus: 0 };
      }

      if (now > deadline) {
        onTime = false;
        late = true;
      }
    }

    const pointsAwarded = onTime ? getSurveyPoints(input.day_number) : 0;
    const latePenalty = late ? LATE_PENALTY : 0;

    // Insert submission
    const inserted = await ctx.integrations.apps_database.query(
      `INSERT INTO camp201_daily_survey_submissions (camper_id, day_number, cohort_id, points_awarded)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      z.object({ id: z.coerce.number() }),
      [input.camper_id, input.day_number, cohortId, pointsAwarded + latePenalty],
      { label: "Insert submission" }
    );
    const submissionId = inserted[0].id;

    // Insert session ratings
    for (const sr of input.session_ratings) {
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_session_ratings (submission_id, agenda_item_id, session_title, session_type, rating, usefulness, comment)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [submissionId, sr.agenda_item_id, sr.session_title, sr.session_type, sr.rating, sr.usefulness, sr.comment ?? ""],
        { label: `Rate: ${sr.session_title}` }
      );
    }

    // Insert open responses
    for (const or_ of input.open_responses) {
      if (or_.response.trim()) {
        await ctx.integrations.apps_database.execute(
          `INSERT INTO camp201_survey_open_responses (submission_id, question_key, response)
           VALUES ($1, $2, $3)`,
          [submissionId, or_.key, or_.response.trim()],
          { label: `Open: ${or_.key}` }
        );
      }
    }

    // Insert overall ratings (final day)
    if (input.overall_ratings) {
      for (const oRating of input.overall_ratings) {
        await ctx.integrations.apps_database.execute(
          `INSERT INTO camp201_survey_overall_ratings (submission_id, aspect_key, rating)
           VALUES ($1, $2, $3)`,
          [submissionId, oRating.aspect_key, oRating.rating],
          { label: `Overall: ${oRating.aspect_key}` }
        );
      }
    }

    // Insert overall open responses (final day)
    if (input.overall_open_responses) {
      for (const oor of input.overall_open_responses) {
        if (oor.response.trim()) {
          await ctx.integrations.apps_database.execute(
            `INSERT INTO camp201_survey_open_responses (submission_id, question_key, response)
             VALUES ($1, $2, $3)`,
            [submissionId, oor.key, oor.response.trim()],
            { label: `Overall open: ${oor.key}` }
          );
        }
      }
    }

    // Award/deduct individual points
    const netPoints = pointsAwarded + latePenalty;

// Award Survey Complete badge (earn_count only, no accelerator points — surveys use escalating)
if (onTime) {
  // Just increment the badge earn count, don't award accelerator points
  await ctx.integrations.apps_database.execute(
    `INSERT INTO camp201_camper_badges (camper_id, badge_id, earn_count)
     VALUES ($1, $2, 1)
     ON CONFLICT (camper_id, badge_id) DO UPDATE SET earn_count = camp201_camper_badges.earn_count + 1`,
    [input.camper_id, BADGE_IDS.SURVEY],
    { label: "Increment Survey badge earn count" }
  );
}

// For surveys, award escalating points directly (Day 1=2, Day 2=4, etc.)
if (pointsAwarded > 0) {
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
        [pointsAwarded, input.camper_id], { label: "Award escalating survey points" }
      );
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, cohort_id)
         VALUES ($1, $2, $3, 'system', $4)`,
        [input.camper_id, pointsAwarded, `Day ${input.day_number} survey completed (on time)`, cohortId],
        { label: "Log survey points" }
      );
    }

    // Apply late penalty separately
    if (latePenalty < 0) {
      await ctx.integrations.apps_database.execute(
        `UPDATE camp201_campers SET points = points + $1 WHERE id = $2`,
        [latePenalty, input.camper_id], { label: "Apply late penalty" }
      );
      await ctx.integrations.apps_database.execute(
        `INSERT INTO camp201_points_log (camper_id, points, reason, awarded_by, cohort_id)
         VALUES ($1, $2, $3, 'system', $4)`,
        [input.camper_id, latePenalty, `Day ${input.day_number} survey submitted late`, cohortId],
        { label: "Log late penalty" }
      );
    }

    // Team race check: did this submission complete the team?
    let teamRaceBonusResult = 0;
    const CamperTeamSchema = z.object({ team_id: z.coerce.number() });
    const camperTeam = await ctx.integrations.apps_database.query(
      `SELECT team_id FROM camp201_campers WHERE id = $1 AND team_id IS NOT NULL LIMIT 1`,
      CamperTeamSchema, [input.camper_id], { label: "Get camper team" }
    );

    if (camperTeam.length > 0) {
      const teamId = camperTeam[0].team_id;
      const CountSchema = z.object({ total: z.coerce.number(), submitted: z.coerce.number() });
      const teamCounts = await ctx.integrations.apps_database.query(
        `SELECT
           COUNT(c.id)::integer as total,
           COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN c.id END)::integer as submitted
         FROM camp201_campers c
         LEFT JOIN camp201_daily_survey_submissions s ON s.camper_id = c.id AND s.day_number = $2 AND s.cohort_id = $3
         WHERE c.team_id = $1 AND c.role NOT IN ('counselor','admin')`,
        CountSchema, [teamId, input.day_number, cohortId],
        { label: "Check team completion" }
      );

      if (teamCounts.length > 0 && teamCounts[0].total === teamCounts[0].submitted) {
        const CompletedTeamsSchema = z.object({ completed_teams: z.coerce.number() });
        const completedResult = await ctx.integrations.apps_database.query(
          `SELECT COUNT(DISTINCT sub.team_id)::integer as completed_teams FROM (
             SELECT c.team_id,
                    COUNT(c.id) as total,
                    COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN c.id END) as submitted
             FROM camp201_campers c
             LEFT JOIN camp201_daily_survey_submissions s ON s.camper_id = c.id AND s.day_number = $1 AND s.cohort_id = $2
             WHERE c.team_id IS NOT NULL AND c.role NOT IN ('counselor','admin')
             GROUP BY c.team_id
             HAVING COUNT(c.id) = COUNT(DISTINCT CASE WHEN s.id IS NOT NULL THEN c.id END)
           ) sub`,
          CompletedTeamsSchema, [input.day_number, cohortId],
          { label: "Count completed teams" }
        );

        const rank = completedResult[0]?.completed_teams ?? 1;
        const bonus = rank <= TEAM_RACE_REWARDS.length ? TEAM_RACE_REWARDS[rank - 1] : 0;
        teamRaceBonusResult = bonus;

        if (bonus > 0) {
          // Award to TEAM points (not individual members)
          await ctx.integrations.apps_database.execute(
            `UPDATE camp201_teams SET team_points = team_points + $1 WHERE id = $2`,
            [bonus, teamId], { label: "Award team race bonus to team_points" }
          );
          await ctx.integrations.apps_database.execute(
            `INSERT INTO camp201_team_points_log (team_id, points, reason, cohort_id)
             VALUES ($1, $2, $3, $4)`,
            [teamId, bonus, `Day ${input.day_number} survey: Team finished ${rank}${rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th"}!`, cohortId],
            { label: "Log team race bonus" }
          );
        }
      }
    }

    const finalBonus = typeof teamRaceBonusResult === "number" ? teamRaceBonusResult : 0;

    return {
      success: true,
      points_awarded: netPoints,
      on_time: onTime,
      late,
      locked: false,
      team_race_bonus: finalBonus,
    };
  },
});
