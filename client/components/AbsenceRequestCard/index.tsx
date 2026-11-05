import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import AbsenceLimitDialog from "@/components/AbsenceLimitDialog/index.js";
import { formatDuration, toLocalInputValue } from "@/lib/absences.js";

/** Attendance bonus tiers, with the cAMPer's current tier highlighted. */
function AttendanceBonus({ used, limit }: { used: number; limit: number }) {
  const tiers = Array.from({ length: limit + 1 }, (_, n) => ({ n, pts: limit - n }));
  const current = Math.min(used, limit);
  return (
    <div className="mt-3 rounded-lg border-2 border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-900">
        <Icon icon="trophy" className="h-4 w-4 text-amber-600" />
        Attendance bonus at Close cAMP
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {tiers.map((t) => {
          const active = t.n === current;
          return (
            <span
              key={t.n}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                active
                  ? "bg-amber-500 text-white shadow-sm ring-2 ring-amber-300"
                  : t.n < current
                    ? "bg-white/60 text-muted-foreground line-through"
                    : "bg-white text-amber-900 border border-amber-200"
              }`}
            >
              {t.n} absence{t.n === 1 ? "" : "s"} → <span className="font-extrabold">{t.pts > 0 ? `+${t.pts}` : "0"}</span>
            </span>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] font-medium text-amber-900/80">
        {used >= limit
          ? "You've used all your excused absences. Any more need a counselor and may cost 1 point each."
          : `You're on track for +${limit - used} points. Every absence you skip keeps more points on the table!`}
      </p>
    </div>
  );
}

type Props = {
  camperId: number;
  /** Counselor preview: shows the card exactly as cAMPers see it, with submitting turned off. */
  preview?: boolean;
};

/** cAMPer's excused absence form: reason + start/end time, 3-absence counter, limit modal. */
export default function AbsenceRequestCard({ camperId, preview = false }: Props) {
  const { data, refetch } = useApiData("GetAbsenceRequests", { camper_id: camperId }, { enabled: camperId > 0 });
  const { run: requestAbsence, loading } = useApi("RequestAbsence");

  const [reason, setReason] = useState("");
  const [start, setStart] = useState(() => toLocalInputValue(new Date()));
  const [end, setEnd] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [limitOpen, setLimitOpen] = useState(false);

  const limit = data?.limit ?? 3;
  const summary = data?.summaries?.[0];
  const used = summary?.standard_used ?? 0;
  const extras = (summary?.penalty_count ?? 0) + (summary?.emergency_count ?? 0);
  const requests = data?.requests ?? [];

  const minutes = useMemo(() => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return Number.isFinite(s) && Number.isFinite(e) && e > s ? Math.round((e - s) / 60000) : 0;
  }, [start, end]);

  const canSubmit = !preview && reason.trim().length >= 3 && minutes > 0 && !loading;

  const submit = useCallback(
    async (approval: { type: "penalty" | "emergency"; password: string } | null) => {
      try {
        const result = await requestAbsence({
          camper_id: camperId,
          start_time: new Date(start).toISOString(),
          end_time: new Date(end).toISOString(),
          reason: reason.trim(),
          counselor_approval: approval,
        });
        if (result?.error === "limit_reached") {
          setLimitOpen(true);
          return false;
        }
        if (result?.error === "bad_password") {
          toast.error("That counselor password isn't right.");
          return false;
        }
        if (result?.error === "camp_closed") {
          toast.error("cAMP is closed, so absences can't be added.");
          return false;
        }
        toast.success(approval ? "Absence approved by a counselor." : `Excused absence recorded (${result?.standard_used ?? used + 1}/${limit} used).`);
        setReason("");
        setLimitOpen(false);
        await refetch();
        return true;
      } catch (error) {
        const message = error && typeof error === "object" && "message" in error ? String((error as { message: unknown }).message) : String(error);
        toast.error(message);
        return false;
      }
    },
    [camperId, start, end, reason, requestAbsence, refetch, used, limit]
  );

  const handleSubmit = useCallback(() => {
    if (preview) return;
    if (used >= limit) {
      setLimitOpen(true);
      return;
    }
    void submit(null);
  }, [preview, used, limit, submit]);

  return (
    <Card className={`p-6 ${preview ? "border-dashed" : ""}`}>
      {preview && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
          <Icon icon="eye" className="h-4 w-4 shrink-0" />
          <span>
            <b>Counselor preview:</b> this is what cAMPers see on their profile. Submitting is off for counselors.
          </span>
        </div>
      )}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Icon icon="calendar-x" className="w-5 h-5 text-camp-amber" />
            Request Excused Absence
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Need to step away? Log it so your team isn't held back in the check-in race.
          </p>
          <AttendanceBonus used={used} limit={limit} />
        </div>
        <div
          className={`shrink-0 rounded-lg border px-3 py-1.5 text-center ${
            used >= limit ? "border-red-200 bg-red-50 text-red-700" : used > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          <p className="text-lg font-bold leading-none">
            {used}/{limit}
          </p>
          <p className="text-[10px] font-medium mt-0.5">absences used</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="md:col-span-2 flex flex-col gap-1.5">
          <Label className="text-xs">Reason *</Label>
          <Input placeholder="e.g. customer call, doctor's appointment" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Start *</Label>
          <Input type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">End *</Label>
          <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {minutes > 0 ? (
            <>
              Total time away: <span className="font-semibold text-foreground">{formatDuration(minutes)}</span>
            </>
          ) : (
            <span className="text-destructive">End time must be after the start time</span>
          )}
        </p>
        <Button onClick={handleSubmit} disabled={!canSubmit} variant="outline">
          {loading ? "Submitting..." : "Submit"}
        </Button>
      </div>

      {requests.length > 0 && (
        <div className="mt-4 border-t border-border pt-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">Your absences{extras > 0 ? ` (incl. ${extras} counselor-approved extra)` : ""}</p>
          <ul className="space-y-1.5">
            {requests.slice(0, 10).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs">
                <span className="truncate text-foreground">{r.reason ?? "No reason"}</span>
                <span className="shrink-0 text-muted-foreground">
                  {new Date(r.start_time).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })} · {formatDuration(r.minutes)}
                  {r.approval_type !== "standard" && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${r.approval_type === "counselor_emergency" ? "bg-sky-100 text-sky-800" : "bg-red-100 text-red-700"}`}>
                      {r.approval_type === "counselor_emergency" ? "Emergency" : "−1 pt"}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AbsenceLimitDialog open={limitOpen} limit={limit} submitting={loading} onClose={() => setLimitOpen(false)} onCounselorApprove={submit} />
    </Card>
  );
}
