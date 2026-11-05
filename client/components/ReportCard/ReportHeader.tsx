import { Icon } from "@/components/ui/icon";
import CamperAvatar from "@/components/CamperAvatar/index.js";
import RegionPill from "@/components/RegionPill/index.js";
import { getRoleStyle, mapToStandardRole } from "@/lib/roles.js";
import { getCountryDisplayName, getCountryStyle, formatTenure } from "@/lib/countryUtils.js";
import type { ReportCardData } from "./types.js";

/** Name, photo, role, manager, team and headline numbers. */
export default function ReportHeader({ data }: { data: ReportCardData }) {
  const p = data.profile!;
  const s = data.stats!;
  const roleStyle = getRoleStyle(p.role);
  const country = getCountryDisplayName(p.country);
  const countryStyle = getCountryStyle(p.country);
  const tenure = formatTenure(p.start_date);
  const goalsHit = [p.goal_1_achieved, p.goal_2_achieved, p.goal_3_achieved].filter(Boolean).length;
  const goalsSet = [p.goal_1, p.goal_2, p.goal_3].filter((g) => g && g.trim()).length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="h-2" style={{ backgroundColor: p.team_color || "var(--color-primary)" }} />
      <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center">
        <CamperAvatar email={p.email} photoUrl={p.photo_url} name={`${p.first_name} ${p.last_name}`} size="xl" className="shrink-0 shadow-md" />
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">cAMP 201 report card</p>
          <h2 className="text-2xl font-extrabold text-foreground">{p.first_name} {p.last_name}</h2>
          <p className="text-sm text-muted-foreground">{p.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {p.role && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${roleStyle.pill}`} title={p.role}>
                <Icon icon="briefcase" className="h-3 w-3" />
                {mapToStandardRole(p.role) ?? p.role}
              </span>
            )}
            {country && countryStyle && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${countryStyle.bg} ${countryStyle.text}`}>
                {countryStyle.flag} {country.replace(/^the /, "")}
              </span>
            )}
            <RegionPill region={p.region} country={p.country} />
            {p.manager_display && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                <Icon icon="user-round-check" className="h-3 w-3" />
                Mgr: {p.manager_display}
              </span>
            )}
            {p.team_name && (
              <span
                className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold"
                style={{ backgroundColor: p.team_color ? `${p.team_color}20` : undefined, color: p.team_color || undefined }}
              >
                <Icon icon="flag" className="h-3 w-3" />
                {p.team_name}
              </span>
            )}
            {tenure && (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                <Icon icon="clock" className="h-3 w-3" />
                {tenure}
              </span>
            )}
          </div>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-3xl font-extrabold text-amber-600">{p.points}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Points</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-camp-green">#{s.rank}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">of {s.total_campers}</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-purple-600">{data.badges.filter((b) => b.earned).length}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Badges</p>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-5">
        {[
          { label: "Check-ins", value: `${s.checkins_on_time + s.checkins_late}/${s.checkins_total_sessions}` },
          { label: "Surveys", value: `${s.survey_days.length} day${s.survey_days.length === 1 ? "" : "s"}` },
          { label: "Goals hit", value: `${goalsHit}/${goalsSet || 3}` },
          { label: "Absences", value: `${data.absences_used}/${data.absence_limit}` },
          { label: "Team rank", value: s.team_rank ? `#${s.team_rank} of ${s.total_teams}` : "No team" },
        ].map((m) => (
          <div key={m.label} className="bg-card px-3 py-2.5 text-center">
            <p className="text-sm font-bold text-foreground">{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
