import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import CamperAvatar from "@/components/CamperAvatar/index.js";
import { APPROVAL_LABELS, formatDuration } from "@/lib/absences.js";
import { EmptyLine, ReportSection, ReportStat, fmtDate } from "./ReportSection.js";
import type { ReportCardData } from "./types.js";
import type { IconName } from "lucide-react/dynamic";

type Props = { data: ReportCardData };

/** Gains and losses with the full history. */
export function PointsSection({ data }: Props) {
  const s = data.stats!;
  const [showAll, setShowAll] = useState(false);
  const rows = showAll ? data.points_log : data.points_log.slice(0, 10);
  return (
    <ReportSection icon="zap" iconClass="text-amber-500" title="Points" aside={`${data.points_log.length} entries`}>
      <div className="mb-3 grid grid-cols-3 gap-2">
        <ReportStat value={data.profile!.points} label="Total" tone="text-amber-600" />
        <ReportStat value={`+${s.points_gained}`} label="Earned" tone="text-emerald-600" />
        <ReportStat value={s.points_lost > 0 ? `−${s.points_lost}` : "0"} label="Lost" tone={s.points_lost > 0 ? "text-red-600" : "text-muted-foreground"} />
      </div>
      {data.points_log.length === 0 ? (
        <EmptyLine>No points recorded yet</EmptyLine>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-1.5">
              <div className="min-w-0">
                <p className="truncate text-xs text-foreground">{r.reason || "Points"}</p>
                <p className="text-[10px] text-muted-foreground">{fmtDate(r.created_at, true)}</p>
              </div>
              <span className={`shrink-0 text-xs font-bold ${r.points < 0 ? "text-red-600" : "text-emerald-600"}`}>
                {r.points > 0 ? `+${r.points}` : r.points}
              </span>
            </div>
          ))}
        </div>
      )}
      {data.points_log.length > 10 && (
        <button onClick={() => setShowAll((v) => !v)} className="mt-2 text-xs font-medium text-primary hover:underline">
          {showAll ? "Show less" : `Show all ${data.points_log.length}`}
        </button>
      )}
    </ReportSection>
  );
}

export function BadgesSection({ data }: Props) {
  const earned = data.badges.filter((b) => b.earned);
  const notYet = data.badges.filter((b) => !b.earned);
  return (
    <ReportSection icon="award" iconClass="text-purple-500" title="Badges" aside={`${earned.length} earned`}>
      {earned.length === 0 ? (
        <EmptyLine>No badges earned yet</EmptyLine>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {earned.map((b) => (
            <div key={b.id} className="flex items-center gap-2 rounded-lg border border-border p-2">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-${b.color || "amber"}-100`}>
                <Icon icon={(b.icon || "award") as IconName} className={`h-4 w-4 text-${b.color || "amber"}-600`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">
                  {b.name}
                  {(b.earn_count ?? 1) > 1 && <span className="ml-1 text-muted-foreground">×{b.earn_count}</span>}
                </p>
                {b.description && <p className="line-clamp-1 text-[10px] text-muted-foreground">{b.description}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
      {notYet.length > 0 && (
        <div className="mt-3">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Not yet earned ({notYet.length})</p>
          <div className="flex flex-wrap gap-1">
            {notYet.map((b) => (
              <span key={b.id} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{b.name}</span>
            ))}
          </div>
        </div>
      )}
    </ReportSection>
  );
}

export function AttendanceSection({ data }: Props) {
  const s = data.stats!;
  const attended = s.checkins_on_time + s.checkins_late;
  return (
    <ReportSection icon="calendar-check" iconClass="text-emerald-600" title="Attendance & check-ins">
      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <ReportStat value={`${attended}/${s.checkins_total_sessions}`} label="Sessions" />
        <ReportStat value={s.checkins_on_time} label="On time" tone="text-emerald-600" />
        <ReportStat value={s.checkins_late} label="Late" tone={s.checkins_late > 0 ? "text-amber-600" : "text-muted-foreground"} />
        <ReportStat
          value={`${data.absences_used}/${data.absence_limit}`}
          label="Excused absences"
          tone={data.absences_used >= data.absence_limit ? "text-red-600" : "text-foreground"}
        />
      </div>

      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Excused absences</p>
      {data.absences.length === 0 ? (
        <EmptyLine>No absences requested</EmptyLine>
      ) : (
        <div className="mb-3 space-y-1.5">
          {data.absences.map((a) => {
            const label = APPROVAL_LABELS[a.approval_type] ?? APPROVAL_LABELS.standard;
            return (
              <div key={a.id} className="rounded-lg border border-border p-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">
                    {fmtDate(a.start_time, true)} → {a.end_time ? new Date(a.end_time).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "?"}
                    <span className="ml-1.5 text-muted-foreground">({formatDuration(a.minutes)})</span>
                  </p>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${label.className}`}>{label.label}</span>
                </div>
                {a.reason && <p className="mt-0.5 text-[11px] text-muted-foreground">{a.reason}</p>}
                {a.approved_by && a.approval_type !== "standard" && (
                  <p className="mt-0.5 text-[10px] text-muted-foreground">Approved by {a.approved_by}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Check-in history</p>
      {data.checkins.length === 0 ? (
        <EmptyLine>No check-ins recorded</EmptyLine>
      ) : (
        <div className="divide-y divide-border">
          {data.checkins.slice(0, 15).map((c, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="min-w-0">
                <p className="truncate text-xs text-foreground">{c.session_label || "Session"}</p>
                <p className="text-[10px] text-muted-foreground">{fmtDate(c.checked_in_at, true)}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  c.timing === "late" ? "bg-amber-100 text-amber-700" : c.timing === "early" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {c.timing ?? "on time"}
              </span>
            </div>
          ))}
        </div>
      )}
    </ReportSection>
  );
}

export function EngagementSection({ data }: Props) {
  const s = data.stats!;
  const items: { icon: IconName; label: string; value: string | number; tone?: string }[] = [
    { icon: "message-circle-question", label: "Speaker questions asked", value: s.questions_asked },
    { icon: "thumbs-up", label: "Q&A votes cast", value: s.votes_cast },
    { icon: "camera", label: "Photo memories", value: s.memories_photo },
    { icon: "pen-line", label: "Text memories", value: s.memories_text },
    { icon: "heart-handshake", label: "Peer feedback given", value: s.peer_feedback },
    { icon: "sparkles", label: "Camp Spirit votes received", value: s.spirit_votes_received },
    { icon: "ferris-wheel", label: "Wheel & Deal pitches", value: s.wheel_pitches ? `${s.wheel_pitches} (${s.wheel_points} pts)` : 0 },
    { icon: "grid-3x3", label: "Fireside Finder", value: s.bingo_found != null ? `${s.bingo_found} found · ${s.bingo_bingos ?? 0} bingo${(s.bingo_bingos ?? 0) === 1 ? "" : "s"}` : "Not played" },
    { icon: "book-open", label: "Pre-work items done", value: s.prework_done },
  ];
  return (
    <ReportSection icon="activity" iconClass="text-orange-500" title="Engagement">
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {items.map((it) => (
          <div key={it.label} className="flex items-center justify-between gap-3 border-b border-border py-1.5 last:border-0">
            <span className="flex min-w-0 items-center gap-2 text-xs text-foreground">
              <Icon icon={it.icon} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{it.label}</span>
            </span>
            <span className="shrink-0 text-xs font-bold text-foreground">{it.value}</span>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Daily surveys</p>
        <div className="flex flex-wrap gap-1.5">
          {s.survey_days.length === 0 ? (
            <span className="text-xs text-muted-foreground">None submitted yet</span>
          ) : (
            s.survey_days.map((d) => (
              <span key={d} className="rounded-full bg-purple-100 px-2 py-0.5 text-[11px] font-semibold text-purple-700">Day {d} ✓</span>
            ))
          )}
        </div>
      </div>
    </ReportSection>
  );
}

export function GoalsSection({ data }: Props) {
  const p = data.profile!;
  const goals = [
    { text: p.goal_1, hit: p.goal_1_achieved },
    { text: p.goal_2, hit: p.goal_2_achieved },
    { text: p.goal_3, hit: p.goal_3_achieved },
  ].filter((g) => g.text && g.text.trim());
  return (
    <ReportSection icon="target" iconClass="text-red-500" title="Goals" aside={`${goals.filter((g) => g.hit).length}/${goals.length} hit`}>
      {goals.length === 0 ? (
        <EmptyLine>No goals set</EmptyLine>
      ) : (
        <div className="space-y-2">
          {goals.map((g, i) => (
            <div key={i} className="flex items-start gap-2">
              <Icon icon={g.hit ? "circle-check" : "circle"} className={`mt-0.5 h-4 w-4 shrink-0 ${g.hit ? "text-emerald-600" : "text-muted-foreground/50"}`} />
              <p className={`text-sm ${g.hit ? "text-foreground" : "text-foreground/80"}`}>{g.text}</p>
            </div>
          ))}
        </div>
      )}
    </ReportSection>
  );
}

export function PresentationsSection({ data }: Props) {
  return (
    <ReportSection icon="presentation" iconClass="text-indigo-500" title="Team presentation scores" aside={data.profile?.team_name ?? undefined}>
      {data.rubric_scores.length === 0 ? (
        <EmptyLine>No presentation scores yet</EmptyLine>
      ) : (
        <div className="space-y-2">
          {data.rubric_scores.map((r, i) => (
            <div key={i} className="rounded-lg border border-border p-2">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-xs font-semibold text-foreground">{r.presentation}</p>
                <span className="shrink-0 text-xs font-bold text-indigo-600">
                  {r.total_score ?? "—"}{r.max_score ? `/${r.max_score}` : ""}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                {r.judge_name || "Judge"}{r.is_guest_judge ? " (guest judge)" : ""}
              </p>
              {r.notes && <p className="mt-1 text-[11px] italic text-foreground/80">"{r.notes}"</p>}
            </div>
          ))}
        </div>
      )}
    </ReportSection>
  );
}

export function TeamSection({ data }: Props) {
  const p = data.profile!;
  const s = data.stats!;
  if (!p.team_name) {
    return (
      <ReportSection icon="flag" iconClass="text-camp-green" title="Team">
        <EmptyLine>Not on a team yet</EmptyLine>
      </ReportSection>
    );
  }
  return (
    <ReportSection icon="flag" iconClass="text-camp-green" title="Team" aside={s.team_rank ? `#${s.team_rank} of ${s.total_teams}` : undefined}>
      <div className="mb-3 flex items-center gap-3">
        {p.team_logo_url ? (
          <img src={p.team_logo_url} alt={p.team_name} className="h-12 w-12 rounded-lg border-2 bg-white object-contain" style={{ borderColor: p.team_color || "#ccc" }} />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg text-lg font-bold text-white" style={{ backgroundColor: p.team_color || "#4a7c59" }}>
            {p.team_name.charAt(0)}
          </div>
        )}
        <p className="font-bold text-foreground">{p.team_name}</p>
      </div>
      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
        {data.teammates.map((m) => (
          <div key={m.id} className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1">
            <CamperAvatar email="" name={m.name} photoUrl={m.photo_url} size="sm" className="!h-6 !w-6" />
            <span className="min-w-0 flex-1 truncate text-xs text-foreground">{m.name}</span>
            <span className="text-[10px] font-semibold text-muted-foreground">{m.points} pts</span>
          </div>
        ))}
      </div>
    </ReportSection>
  );
}

export function ProfileSection({ data, showPin = true }: Props & { showPin?: boolean }) {
  const p = data.profile!;
  const flight = p.flight_is_local
    ? "Local (not flying)"
    : p.flight_departure_date
      ? `${p.flight_departure_date}${p.flight_departure_time ? ` at ${p.flight_departure_time}` : ""}`
      : "Not provided";
  const rows: { label: string; value: string }[] = [
    { label: "Profile", value: p.profile_completed ? "Complete" : "Incomplete" },
    { label: "Registered", value: fmtDate(p.created_at) },
    { label: "Start date", value: p.start_date ? fmtDate(p.start_date) : "—" },
    { label: "City", value: p.city || "—" },
    { label: "Departure flight", value: flight },
    ...(showPin ? [{ label: "PIN", value: p.pin || "—" }] : []),
  ];
  return (
    <ReportSection icon="id-card" iconClass="text-sky-600" title="Profile & travel">
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 border-b border-border py-1.5 last:border-0">
            <span className="text-xs text-muted-foreground">{r.label}</span>
            <span className={`text-xs font-medium ${r.value === "Incomplete" ? "text-amber-700" : "text-foreground"}`}>{r.value}</span>
          </div>
        ))}
      </div>
      {p.fun_fact && (
        <p className="mt-3 text-xs italic text-foreground/70">
          <span className="font-semibold not-italic text-muted-foreground">Fun fact: </span>"{p.fun_fact}"
        </p>
      )}
      {p.bio && <p className="mt-2 whitespace-pre-line text-xs text-foreground/80">{p.bio}</p>}
    </ReportSection>
  );
}
