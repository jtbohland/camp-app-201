import { z } from "@superblocksteam/sdk-api";

/**
 * One cAMPer's activity timeline: everything they did, plus everything they missed.
 * `key` is stable (`<type>:<id>`) so later features can attach reactions/comments to an event.
 * status: done | late | missed | excused | info
 */

export const TimelineEventSchema = z.object({
  key: z.string(),
  kind: z.string(),
  status: z.string(),
  title: z.string(),
  detail: z.string().nullable(),
  at: z.string(),
  points: z.coerce.number().nullable(),
});
export type TimelineEvent = z.infer<typeof TimelineEventSchema>;

export const TimelineSummarySchema = z.object({
  done: z.number(),
  missed: z.number(),
  excused: z.number(),
});

/** Number of daily surveys in a cAMP (matches the survey tracker). */
const SURVEY_DAY_COUNT = 5;
const MAX_EVENTS = 300;

const CamperRow = z.object({ cohort_id: z.coerce.number().nullable(), created_at: z.string() });

export async function loadActivityTimeline(
  db: any,
  camperId: number,
): Promise<{ events: TimelineEvent[]; summary: z.infer<typeof TimelineSummarySchema> }> {
  const campers = await db.query(
    `SELECT cohort_id, created_at::text AS created_at FROM camp201_campers WHERE id = $1 LIMIT 1`,
    CamperRow, [camperId], { label: "Timeline: cAMPer" }
  );
  const camper: z.infer<typeof CamperRow> | undefined = campers[0];
  if (!camper) return { events: [], summary: { done: 0, missed: 0, excused: 0 } };

  const [rows, startRows, surveyDays, missingPrework] = await Promise.all([
    db.query(
      `SELECT e.key, e.kind, e.status, e.title, e.detail, e.at::text AS at, e.points FROM (
         SELECT ('checkin:' || r.id)::text AS key, 'checkin'::text AS kind,
                (CASE WHEN r.timing = 'late' THEN 'late' ELSE 'done' END)::text AS status,
                ('Checked in: ' || COALESCE(s.label, 'Session'))::text AS title,
                (CASE WHEN r.timing = 'late' THEN 'Late' WHEN r.timing = 'early' THEN 'Early' ELSE 'On time' END)::text AS detail,
                r.checked_in_at::timestamptz AS at, r.points_awarded::int AS points
         FROM camp201_checkin_responses r JOIN camp201_checkin_sessions s ON s.id = r.session_id
         WHERE r.camper_id = $1

         UNION ALL
         SELECT 'session:' || s.id, 'checkin',
                CASE WHEN ex.id IS NULL THEN 'missed' ELSE 'excused' END,
                CASE WHEN ex.id IS NULL THEN 'Missed check-in: ' ELSE 'Excused from: ' END || COALESCE(s.label, 'Session'),
                CASE WHEN ex.id IS NULL THEN 'No check-in recorded' ELSE COALESCE(NULLIF(ex.reason, ''), 'Excused absence') END,
                s.started_at::timestamptz, NULL
         FROM camp201_checkin_sessions s
         LEFT JOIN LATERAL (
           SELECT a.id, a.reason FROM camp201_absence_requests a
           WHERE a.camper_id = $1 AND COALESCE(a.status, 'approved') = 'approved'
             AND a.start_time <= COALESCE(s.timer_ends_at, s.started_at) AND a.end_time >= s.started_at
           LIMIT 1
         ) ex ON true
         WHERE s.cohort_id = $2 AND s.status <> 'active' AND s.started_at >= $3::timestamptz
           AND NOT EXISTS (SELECT 1 FROM camp201_checkin_responses r WHERE r.session_id = s.id AND r.camper_id = $1)

         UNION ALL
         SELECT 'survey:' || d.id, 'survey', 'done', 'Submitted Day ' || d.day_number || ' survey', NULL,
                d.submitted_at::timestamptz, d.points_awarded
         FROM camp201_daily_survey_submissions d WHERE d.camper_id = $1

         UNION ALL
         SELECT 'badge:' || cb.id, 'badge', 'done', 'Earned ' || b.name, b.description, cb.awarded_at::timestamptz, NULL
         FROM camp201_camper_badges cb JOIN camp201_badges b ON b.id = cb.badge_id
         WHERE cb.camper_id = $1 AND b.id NOT IN (7, 8, 9, 103)

         UNION ALL
         SELECT 'memory:' || m.id, 'memory', 'done',
                CASE WHEN m.memory_type = 'photo' THEN 'Shared a photo memory' ELSE 'Shared a memory' END,
                left(m.content, 140), m.created_at::timestamptz, NULL
         FROM camp201_memories m WHERE m.camper_id = $1

         UNION ALL
         SELECT 'exec_q:' || q.id, 'exec_q', 'done', 'Asked a speaker question', left(q.question_text, 140),
                q.created_at::timestamptz, NULL
         FROM camp201_exec_questions q WHERE q.submitted_by = $1

         UNION ALL
         SELECT 'wheel:' || w.id, 'wheel', 'done', 'Pitched ' || COALESCE(w.product_name, 'a product') || ' at Wheel & Deal',
                NULLIF(w.challenge_type, ''), w.created_at::timestamptz, w.points_awarded
         FROM camp201_wheel_rounds w WHERE w.pitcher_id = $1

         UNION ALL
         SELECT 'prework:' || pw.id, 'prework', 'done', 'Finished pre-work: ' || COALESCE(jc.title, pw.item), NULL,
                COALESCE(pw.completed_at, pw.created_at)::timestamptz, NULL
         FROM camp201_prework pw
         LEFT JOIN LATERAL (
           SELECT j.title FROM camp201_journey_content j WHERE j.section = 'prework' AND j.item_key = pw.item LIMIT 1
         ) jc ON true
         WHERE pw.user_id = $1 AND pw.completed = true

         UNION ALL
         SELECT 'feedback:' || f.id, 'feedback', 'done', 'Gave peer feedback', NULLIF(f.session_label, ''),
                f.created_at::timestamptz, f.points_awarded
         FROM camp201_peer_feedback f WHERE f.author_id = $1

         UNION ALL
         SELECT 'absence:' || a.id, 'absence', 'info', 'Requested an excused absence', NULLIF(a.reason, ''),
                a.created_at::timestamptz, NULL
         FROM camp201_absence_requests a WHERE a.camper_id = $1

         UNION ALL
         SELECT 'points:' || pl.id, 'points', 'missed', 'Lost ' || (-pl.points) || ' pts', NULLIF(pl.reason, ''),
                pl.created_at::timestamptz, pl.points
         FROM camp201_points_log pl WHERE pl.camper_id = $1 AND pl.points < 0
       ) e
       WHERE e.at IS NOT NULL
       ORDER BY e.at DESC
       LIMIT ${MAX_EVENTS}`,
      TimelineEventSchema,
      [camperId, camper.cohort_id, camper.created_at],
      { label: "Timeline: activity events" }
    ),
    db.query(
      `SELECT value FROM camp201_config WHERE key = 'camp_start_date' LIMIT 1`,
      z.object({ value: z.string().nullable() }), undefined, { label: "Timeline: camp start date" }
    ),
    db.query(
      `SELECT DISTINCT day_number FROM camp201_daily_survey_submissions WHERE camper_id = $1 LIMIT 20`,
      z.object({ day_number: z.coerce.number() }), [camperId], { label: "Timeline: submitted survey days" }
    ),
    db.query(
      `SELECT j.title FROM camp201_journey_content j
       WHERE j.section = 'prework' AND j.item_key IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM camp201_prework pw WHERE pw.user_id = $1 AND pw.item = j.item_key AND pw.completed = true)
       ORDER BY j.sort_order LIMIT 20`,
      z.object({ title: z.string().nullable() }), [camperId], { label: "Timeline: unfinished pre-work" }
    ),
  ]);

  const events: TimelineEvent[] = [...rows];
  const now = new Date();
  const registered = new Date(camper.created_at);
  const startRaw: string | null | undefined = startRows[0]?.value;

  if (startRaw) {
    const start = new Date(`${startRaw}T00:00:00-07:00`);
    if (!Number.isNaN(start.getTime())) {
      // Daily surveys lock at 9am the next morning (same rule as GetDailySurvey).
      const submitted = new Set(surveyDays.map((d: { day_number: number }) => d.day_number));
      for (let day = 1; day <= SURVEY_DAY_COUNT; day++) {
        const deadline = new Date(start);
        deadline.setDate(deadline.getDate() + day);
        deadline.setHours(9, 0, 0, 0);
        if (deadline < now && deadline > registered && !submitted.has(day)) {
          events.push({
            key: `survey_missed:${day}`,
            kind: "survey",
            status: "missed",
            title: `Missed Day ${day} survey`,
            detail: "Not submitted before it locked",
            at: deadline.toISOString(),
            points: null,
          });
        }
      }
      // Pre-work still unfinished once cAMP started.
      if (start < now && missingPrework.length > 0) {
        const titles = missingPrework.map((m: { title: string | null }) => m.title).filter(Boolean) as string[];
        events.push({
          key: "prework_missed:0",
          kind: "prework",
          status: "missed",
          title: `Pre-work unfinished at cAMP start (${missingPrework.length} item${missingPrework.length === 1 ? "" : "s"})`,
          detail: titles.slice(0, 4).join(", ") + (titles.length > 4 ? "…" : ""),
          at: start.toISOString(),
          points: null,
        });
      }
    }
  }

  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const trimmed = events.slice(0, MAX_EVENTS);
  return {
    events: trimmed,
    summary: {
      done: trimmed.filter((e) => e.status === "done" || e.status === "late").length,
      missed: trimmed.filter((e) => e.status === "missed").length,
      excused: trimmed.filter((e) => e.status === "excused").length,
    },
  };
}
