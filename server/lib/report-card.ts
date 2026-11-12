import { z } from "@superblocksteam/sdk-api";
import { ABSENCE_LIMIT, countsTowardLimit } from "./absences.js";
import { countedSessionSql } from "./checkin-sessions.js";

/** Shared report card loader used by the counselor and manager report card APIs. */

const ProfileRow = z.object({
  id: z.coerce.number(),
  first_name: z.string(),
  last_name: z.string(),
  email: z.string(),
  role: z.string().nullable(),
  region: z.string().nullable(),
  country: z.string().nullable(),
  city: z.string().nullable(),
  manager: z.string().nullable(),
  manager_email: z.string().nullable(),
  manager_name_csv: z.string().nullable(),
  start_date: z.string().nullable(),
  photo_url: z.string().nullable(),
  bio: z.string().nullable(),
  fun_fact: z.string().nullable(),
  linkedin_url: z.string().nullable(),
  points: z.coerce.number(),
  profile_completed: z.boolean().nullable(),
  goal_1: z.string().nullable(),
  goal_2: z.string().nullable(),
  goal_3: z.string().nullable(),
  goal_1_achieved: z.boolean().nullable(),
  goal_2_achieved: z.boolean().nullable(),
  goal_3_achieved: z.boolean().nullable(),
  pin: z.string().nullable(),
  cohort_id: z.coerce.number().nullable(),
  team_id: z.coerce.number().nullable(),
  team_name: z.string().nullable(),
  team_color: z.string().nullable(),
  team_logo_url: z.string().nullable(),
  flight_is_local: z.boolean().nullable(),
  flight_departure_date: z.string().nullable(),
  flight_departure_time: z.string().nullable(),
  created_at: z.string(),
  last_seen_at: z.string().nullable(),
  dietary_options: z.array(z.string()).nullable(),
  dietary_notes: z.string().nullable(),
});

const CountsRow = z.object({
  rank: z.coerce.number(),
  total_campers: z.coerce.number(),
  team_rank: z.coerce.number().nullable(),
  total_teams: z.coerce.number(),
  checkins_on_time: z.coerce.number(),
  checkins_late: z.coerce.number(),
  checkins_total_sessions: z.coerce.number(),
  surveys_days: z.string().nullable(),
  questions_asked: z.coerce.number(),
  votes_cast: z.coerce.number(),
  memories_photo: z.coerce.number(),
  memories_text: z.coerce.number(),
  peer_feedback: z.coerce.number(),
  spirit_votes_received: z.coerce.number(),
  wheel_pitches: z.coerce.number(),
  wheel_points: z.coerce.number(),
  wheel_best: z.coerce.number().nullable(),
  bingo_score: z.coerce.number().nullable(),
  bingo_found: z.coerce.number().nullable(),
  bingo_bingos: z.coerce.number().nullable(),
  prework_done: z.coerce.number(),
  prework_total: z.coerce.number(),
  prework_open: z.string().nullable(),
  points_gained: z.coerce.number(),
  points_lost: z.coerce.number(),
});

const PointsRow = z.object({ points: z.coerce.number(), reason: z.string().nullable(), created_at: z.string() });
const CheckinRow = z.object({ session_label: z.string().nullable(), timing: z.string().nullable(), points_awarded: z.coerce.number().nullable(), checked_in_at: z.string() });
const BadgeRow = z.object({ id: z.coerce.number(), name: z.string(), description: z.string().nullable(), icon: z.string().nullable(), color: z.string().nullable(), earn_count: z.coerce.number().nullable(), earned: z.boolean() });
const AbsenceRow = z.object({ id: z.coerce.number(), reason: z.string().nullable(), start_time: z.string().nullable(), end_time: z.string().nullable(), minutes: z.coerce.number(), approval_type: z.string(), status: z.string(), approved_by: z.string().nullable(), created_at: z.string() });
const RubricRow = z.object({ presentation: z.string().nullable(), judge_name: z.string().nullable(), is_guest_judge: z.boolean().nullable(), total_score: z.coerce.number().nullable(), max_score: z.coerce.number().nullable(), notes: z.string().nullable() });
const TeammateRow = z.object({ id: z.coerce.number(), name: z.string(), photo_url: z.string().nullable(), points: z.coerce.number() });

const StatsOut = CountsRow.omit({ surveys_days: true, prework_open: true }).extend({
  survey_days: z.array(z.number()),
  /** Titles of pre-work items this cAMPer hasn't finished, in display order. */
  prework_open: z.array(z.string()),
});

export const ReportCardSchema = z.object({
  found: z.boolean(),
  profile: ProfileRow.extend({ manager_display: z.string().nullable() }).nullable(),
  stats: StatsOut.nullable(),
  points_log: z.array(PointsRow),
  checkins: z.array(CheckinRow),
  badges: z.array(BadgeRow),
  absences: z.array(AbsenceRow),
  absences_used: z.number(),
  absence_limit: z.number(),
  rubric_scores: z.array(RubricRow),
  teammates: z.array(TeammateRow),
});
export type ReportCard = z.infer<typeof ReportCardSchema>;

/**
 * Everything one cAMPer has done, earned and lost.
 * `includePin` and `includeDietary` are for counselors only (managers never get them).
 */
export async function loadReportCard(
  db: any,
  camperId: number,
  opts: { includePin: boolean; includeDietary?: boolean }
): Promise<ReportCard> {
  const empty: ReportCard = { found: false, profile: null, stats: null, points_log: [], checkins: [], badges: [], absences: [], absences_used: 0, absence_limit: ABSENCE_LIMIT, rubric_scores: [], teammates: [] };

  const profiles = await db.query(
    `SELECT c.id, c.first_name, c.last_name, c.email, c.role, c.region, c.country, c.city,
            c.manager, c.manager_email, nh.manager_name AS manager_name_csv,
            c.start_date::text AS start_date, c.photo_url, c.bio, c.fun_fact, c.linkedin_url,
            COALESCE(c.points, 0) AS points, c.profile_completed,
            c.goal_1, c.goal_2, c.goal_3, c.goal_1_achieved, c.goal_2_achieved, c.goal_3_achieved,
            c.pin, c.cohort_id, c.team_id, t.name AS team_name, t.color AS team_color, t.logo_url AS team_logo_url,
            c.flight_is_local, c.flight_departure_date, c.flight_departure_time, c.created_at::text AS created_at,
            c.last_seen_at::text AS last_seen_at, c.dietary_options, c.dietary_notes
     FROM camp201_campers c
     LEFT JOIN camp201_teams t ON t.id = c.team_id
     LEFT JOIN LATERAL (
       SELECT manager_name FROM camp201_new_hires n
       WHERE lower(n.email) = lower(c.email) ORDER BY n.id DESC LIMIT 1
     ) nh ON true
     WHERE c.id = $1 LIMIT 1`,
    ProfileRow,
    [camperId],
    { label: "Report card: profile" }
  );
  const p: z.infer<typeof ProfileRow> | undefined = profiles[0];
  if (!p) return empty;

  const [counts, pointsLog, checkins, badges, absences, rubric, teammates] = await Promise.all([
    db.query(
      `WITH me AS (SELECT $1::int AS id, $2::int AS cohort, $3::int AS team)
       SELECT
         (SELECT COUNT(*) + 1 FROM camp201_campers x, me
            WHERE x.cohort_id = me.cohort AND x.role NOT IN ('counselor','admin')
              AND COALESCE(x.points,0) > $4) AS rank,
         (SELECT COUNT(*) FROM camp201_campers x, me
            WHERE x.cohort_id = me.cohort AND x.role NOT IN ('counselor','admin')) AS total_campers,
         (SELECT r FROM (
            SELECT t.id, RANK() OVER (ORDER BY COALESCE(t.team_points,0) + COALESCE(SUM(x.points),0) DESC) AS r
            FROM camp201_teams t
            LEFT JOIN camp201_campers x ON x.team_id = t.id AND x.role NOT IN ('counselor','admin')
            WHERE t.cohort_id = (SELECT cohort FROM me)
            GROUP BY t.id
          ) ranked WHERE ranked.id = (SELECT team FROM me)) AS team_rank,
         (SELECT COUNT(*) FROM camp201_teams t, me WHERE t.cohort_id = me.cohort) AS total_teams,
         (SELECT COUNT(*) FROM camp201_checkin_responses r JOIN camp201_checkin_sessions s ON s.id = r.session_id, me
            WHERE r.camper_id = $1 AND r.timing <> 'late' AND s.cohort_id = me.cohort AND ${countedSessionSql("s")}) AS checkins_on_time,
         (SELECT COUNT(*) FROM camp201_checkin_responses r JOIN camp201_checkin_sessions s ON s.id = r.session_id, me
            WHERE r.camper_id = $1 AND r.timing = 'late' AND s.cohort_id = me.cohort AND ${countedSessionSql("s")}) AS checkins_late,
         (SELECT COUNT(*) FROM camp201_checkin_sessions s, me WHERE s.cohort_id = me.cohort AND ${countedSessionSql("s")}) AS checkins_total_sessions,
         (SELECT string_agg(DISTINCT d.day_number::text, ',') FROM camp201_daily_survey_submissions d WHERE d.camper_id = $1) AS surveys_days,
         (SELECT COUNT(*) FROM camp201_exec_questions q WHERE q.submitted_by = $1) AS questions_asked,
         (SELECT COUNT(*) FROM camp201_exec_votes v WHERE v.voter_id = $1) AS votes_cast,
         (SELECT COUNT(*) FROM camp201_memories m WHERE m.camper_id = $1 AND m.memory_type = 'photo') AS memories_photo,
         (SELECT COUNT(*) FROM camp201_memories m WHERE m.camper_id = $1 AND m.memory_type = 'text') AS memories_text,
         (SELECT COUNT(*) FROM camp201_peer_feedback f WHERE f.author_id = $1) AS peer_feedback,
         (SELECT COUNT(*) FROM camp201_spirit_votes s WHERE s.nominee_id = $1) AS spirit_votes_received,
         (SELECT COUNT(*) FROM camp201_wheel_rounds w WHERE w.pitcher_id = $1) AS wheel_pitches,
         (SELECT COALESCE(SUM(w.points_awarded),0) FROM camp201_wheel_rounds w WHERE w.pitcher_id = $1) AS wheel_points,
         (SELECT MAX(w.completion_score) FROM camp201_wheel_rounds w WHERE w.pitcher_id = $1) AS wheel_best,
         (SELECT MAX(b.score) FROM camp201_bingo_cards b WHERE b.camper_id = $1) AS bingo_score,
         (SELECT MAX((SELECT COUNT(*) FROM jsonb_object_keys(COALESCE(b.found_squares,'{}'::jsonb)))) FROM camp201_bingo_cards b WHERE b.camper_id = $1) AS bingo_found,
         (SELECT MAX(jsonb_array_length(COALESCE(b.bingos_claimed,'[]'::jsonb))) FROM camp201_bingo_cards b WHERE b.camper_id = $1) AS bingo_bingos,
         (SELECT COUNT(DISTINCT pw.item) FROM camp201_prework pw WHERE pw.user_id = $1 AND pw.completed = true
            AND EXISTS (SELECT 1 FROM camp201_journey_content jc WHERE jc.section = 'prework' AND jc.item_key = pw.item)) AS prework_done,
         (SELECT COUNT(DISTINCT jc.item_key) FROM camp201_journey_content jc
            WHERE jc.section = 'prework' AND jc.item_key IS NOT NULL) AS prework_total,
         (SELECT string_agg(t.title, '||' ORDER BY t.sort_order) FROM (
            SELECT DISTINCT ON (jc.item_key) jc.item_key, COALESCE(jc.title, jc.item_key) AS title, jc.sort_order
            FROM camp201_journey_content jc
            WHERE jc.section = 'prework' AND jc.item_key IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM camp201_prework pw WHERE pw.user_id = $1 AND pw.item = jc.item_key AND pw.completed = true)
            ORDER BY jc.item_key, jc.sort_order
          ) t) AS prework_open,
         (SELECT COALESCE(SUM(pl.points),0) FROM camp201_points_log pl WHERE pl.camper_id = $1 AND pl.points > 0) AS points_gained,
         (SELECT COALESCE(-SUM(pl.points),0) FROM camp201_points_log pl WHERE pl.camper_id = $1 AND pl.points < 0) AS points_lost
       LIMIT 1`,
      CountsRow,
      [camperId, p.cohort_id, p.team_id, p.points],
      { label: "Report card: engagement counts" }
    ),
    db.query(
      `SELECT points, reason, created_at::text AS created_at FROM camp201_points_log
       WHERE camper_id = $1 ORDER BY created_at DESC LIMIT 100`,
      PointsRow, [camperId], { label: "Report card: points history" }
    ),
    db.query(
      `SELECT s.label AS session_label, r.timing, r.points_awarded, r.checked_in_at::text AS checked_in_at
       FROM camp201_checkin_responses r JOIN camp201_checkin_sessions s ON s.id = r.session_id
       WHERE r.camper_id = $1 ORDER BY r.checked_in_at DESC LIMIT 50`,
      CheckinRow, [camperId], { label: "Report card: check-ins" }
    ),
    db.query(
      `SELECT b.id, b.name, b.description, b.icon, b.color, cb.earn_count, (cb.camper_id IS NOT NULL) AS earned
       FROM camp201_badges b
       LEFT JOIN camp201_camper_badges cb ON cb.badge_id = b.id AND cb.camper_id = $1
       WHERE b.id NOT IN (7, 8, 9, 103)
       ORDER BY (cb.camper_id IS NOT NULL) DESC, b.name LIMIT 100`,
      BadgeRow, [camperId], { label: "Report card: badges" }
    ),
    db.query(
      `SELECT id, reason, start_time::text AS start_time, end_time::text AS end_time,
              GREATEST(0, ROUND(EXTRACT(EPOCH FROM (end_time - start_time)) / 60))::int AS minutes,
              COALESCE(approval_type, 'standard') AS approval_type, COALESCE(status, 'approved') AS status,
              approved_by, created_at::text AS created_at
       FROM camp201_absence_requests WHERE camper_id = $1 ORDER BY start_time DESC NULLS LAST LIMIT 50`,
      AbsenceRow, [camperId], { label: "Report card: absences" }
    ),
    p.team_id
      ? db.query(
          `SELECT COALESCE(pr.title, 'Presentation') AS presentation, rs.judge_name, rs.is_guest_judge,
                  rs.total_score, rs.max_score, rs.notes
           FROM camp201_rubric_scores rs
           LEFT JOIN camp201_presentations pr ON pr.id = rs.presentation_id
           WHERE rs.team_id = $1 ORDER BY rs.created_at DESC LIMIT 50`,
          RubricRow, [p.team_id], { label: "Report card: team rubric scores" }
        )
      : Promise.resolve([]),
    p.team_id
      ? db.query(
          `SELECT id, CONCAT(first_name, ' ', last_name) AS name, photo_url, COALESCE(points,0) AS points
           FROM camp201_campers WHERE team_id = $1 AND id <> $2 AND role NOT IN ('counselor','admin')
           ORDER BY points DESC LIMIT 20`,
          TeammateRow, [p.team_id, camperId], { label: "Report card: teammates" }
        )
      : Promise.resolve([]),
  ]);

  const c: z.infer<typeof CountsRow> = counts[0];
  const { surveys_days, prework_open, ...rest } = c;
  const typedManager = p.manager?.trim() && !/^(other|n\/?a|none|-|tbd|unknown|\?)$/i.test(p.manager.trim()) ? p.manager.trim() : null;
  const managerDisplay =
    p.manager_name_csv ||
    typedManager ||
    (p.manager_email ? p.manager_email.split("@")[0].split(".").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ") : null);
  const typedAbsences: z.infer<typeof AbsenceRow>[] = absences;

  return {
    found: true,
    profile: {
      ...p,
      pin: opts.includePin ? p.pin : null,
      dietary_options: opts.includeDietary ? p.dietary_options ?? [] : null,
      dietary_notes: opts.includeDietary ? p.dietary_notes : null,
      manager_display: managerDisplay,
    },
    stats: {
      ...rest,
      survey_days: (surveys_days ?? "").split(",").filter(Boolean).map(Number).sort((a, b) => a - b),
      prework_open: (prework_open ?? "").split("||").filter(Boolean),
    },
    points_log: pointsLog,
    checkins,
    badges,
    absences: typedAbsences,
    absences_used: typedAbsences.filter((a) => countsTowardLimit(a.approval_type, a.status)).length,
    absence_limit: ABSENCE_LIMIT,
    rubric_scores: rubric,
    teammates,
  };
}
