import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/hooks/useApiData";
import { APPROVAL_LABELS, formatDuration } from "@/lib/absences.js";

const PAGE_SIZE = 20;

type Props = { onCamperClick?: (camperId: number) => void };

/** Counselor Hub → Operations → Absences: usage per cAMPer plus every absence logged. */
export default function AdminAbsences({ onCamperClick }: Props) {
  const { data, loading, fetching, isError, error, refetch } = useApiData("GetAbsenceRequests", { camper_id: null }, { refetchInterval: 30_000 });
  const [page, setPage] = useState(0);

  const limit = data?.limit ?? 3;
  const summaries = data?.summaries ?? [];
  const requests = data?.requests ?? [];

  const stats = useMemo(() => {
    const anyAbsence = summaries.filter((s) => s.standard_used + s.penalty_count + s.emergency_count > 0).length;
    const atLimit = summaries.filter((s) => s.standard_used >= limit).length;
    const extras = summaries.reduce((n, s) => n + s.penalty_count + s.emergency_count, 0);
    const perfect = summaries.length - anyAbsence;
    return { anyAbsence, atLimit, extras, perfect };
  }, [summaries, limit]);

  const withAbsences = summaries.filter((s) => s.standard_used + s.penalty_count + s.emergency_count > 0);
  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const pageRequests = requests.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  if (loading) return <Skeleton className="h-96 rounded-xl" />;
  if (isError) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-destructive">{error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : "Couldn't load absences"}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => refetch()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${fetching ? "opacity-90" : ""}`}>
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon="sparkles" label="Perfect attendance" value={stats.perfect} tone="emerald" />
        <Stat icon="calendar-x" label="Used an absence" value={stats.anyAbsence} tone="amber" />
        <Stat icon="circle-alert" label={`At the ${limit}-absence limit`} value={stats.atLimit} tone="red" />
        <Stat icon="shield" label="Counselor-approved extras" value={stats.extras} tone="sky" />
      </div>

      {/* Per-cAMPer usage */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon icon="users" className="h-4 w-4 text-primary" />
          Usage by cAMPer
          <span className="text-xs font-normal text-muted-foreground">· attendance points are awarded at Close cAMP</span>
        </h3>
        {withAbsences.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">No excused absences yet. Everyone's on track for +3.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
            {withAbsences.map((s) => (
              <button
                key={s.camper_id}
                type="button"
                onClick={() => onCamperClick?.(s.camper_id)}
                className="flex items-center gap-3 rounded-lg border border-border bg-card p-2.5 text-left hover:bg-muted/40"
              >
                <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-muted">
                  {s.photo_url ? <img src={s.photo_url} alt="" className="h-full w-full object-cover" /> : <Icon icon="circle-user" className="h-9 w-9 text-muted-foreground/40" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{s.camper_name}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {s.team_name ?? "No team"} · {formatDuration(s.total_minutes)} away
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${s.standard_used >= limit ? "text-red-600" : "text-amber-700"}`}>
                    {s.standard_used}/{limit}
                  </p>
                  <p className={`text-[10px] font-semibold ${s.attendance_points > 0 ? "text-emerald-700" : s.attendance_points < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                    {s.attendance_points > 0 ? "+" : ""}
                    {s.attendance_points} pts
                    {s.penalty_count + s.emergency_count > 0 && ` · +${s.penalty_count + s.emergency_count} extra`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      {/* Every absence */}
      <Card className="p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon icon="list" className="h-4 w-4 text-primary" />
          All absences ({requests.length})
        </h3>
        {requests.length === 0 ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Nothing logged yet.</p>
        ) : (
          <>
            <div className="overflow-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground">
                    <th className="px-2 py-2 text-left">cAMPer</th>
                    <th className="px-2 py-2 text-left">Reason</th>
                    <th className="px-2 py-2 text-left">When</th>
                    <th className="px-2 py-2 text-left">Time away</th>
                    <th className="px-2 py-2 text-left">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRequests.map((r) => {
                    const tag = APPROVAL_LABELS[r.approval_type] ?? APPROVAL_LABELS.standard;
                    return (
                      <tr key={r.id} className="border-b border-border/60 text-foreground/80">
                        <td className="px-2 py-2 font-medium">
                          <button type="button" className="hover:underline" onClick={() => onCamperClick?.(r.camper_id)}>
                            {r.camper_name}
                          </button>
                          {r.team_name && <span className="ml-1 text-muted-foreground">· {r.team_name}</span>}
                        </td>
                        <td className="max-w-[260px] truncate px-2 py-2" title={r.reason ?? ""}>
                          {r.reason ?? "—"}
                        </td>
                        <td className="whitespace-nowrap px-2 py-2">
                          {new Date(r.start_time).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          {" – "}
                          {new Date(r.end_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </td>
                        <td className="px-2 py-2">{formatDuration(r.minutes)}</td>
                        <td className="px-2 py-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${tag.className}`}>{tag.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button size="sm" variant="outline" className="h-7" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

const TONES: Record<string, string> = {
  emerald: "text-emerald-700 bg-emerald-50 border-emerald-200",
  amber: "text-amber-800 bg-amber-50 border-amber-200",
  red: "text-red-700 bg-red-50 border-red-200",
  sky: "text-sky-800 bg-sky-50 border-sky-200",
};

function Stat({ icon, label, value, tone }: { icon: "sparkles" | "calendar-x" | "circle-alert" | "shield"; label: string; value: number; tone: string }) {
  return (
    <div className={`rounded-xl border p-3 ${TONES[tone]}`}>
      <div className="flex items-center gap-1.5 text-[11px] font-medium">
        <Icon icon={icon} className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
