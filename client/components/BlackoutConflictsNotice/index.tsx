import { useCallback, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { blackoutWhen } from "@/lib/blackouts.js";
import { formatDuration } from "@/lib/absences.js";

type Props = {
  /** Full list (Hub → Absences). Off = a compact banner (Agenda tab). */
  expanded?: boolean;
  onCamperClick?: (camperId: number) => void;
};

function errMsg(err: unknown) {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

function minutesBetween(a: string, b: string) {
  return Math.max(0, Math.round((Date.parse(b) - Date.parse(a)) / 60000));
}

/** Counselors: approved absences that overlap a required session. */
export default function BlackoutConflictsNotice({ expanded = false, onCamperClick }: Props) {
  const { data, refetch } = useApiData("GetBlackoutConflicts", {}, { refetchInterval: 60_000 });
  const { run: respond } = useApi("RespondToBlackoutConflict");
  const [open, setOpen] = useState(expanded);
  const [busyId, setBusyId] = useState<number | null>(null);

  const all = data?.conflicts ?? [];
  const openConflicts = all.filter((c) => c.status === "approved");
  const withdrawn = all.filter((c) => c.status !== "approved");

  const withdraw = useCallback(
    async (id: number, name: string) => {
      setBusyId(id);
      try {
        await respond({ absence_id: id, action: "withdraw" });
        toast.success(`Withdrew ${name}'s absence. It no longer counts toward their 3.`);
        await refetch();
        void queryClient.invalidateQueries("GetAbsenceRequests");
      } catch (err) {
        toast.error("Couldn't withdraw: " + errMsg(err));
      }
      setBusyId(null);
    },
    [respond, refetch]
  );

  if (!data) return null;

  if (!data.start_date_set && data.blackout_count > 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        <Icon icon="calendar-clock" className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {data.blackout_count} required session{data.blackout_count === 1 ? " is" : "s are"} marked, but there's no cAMP start date yet,
          so absences can't be checked against them. Set it in Hub → Pre-work settings.
        </span>
      </div>
    );
  }

  if (openConflicts.length === 0 && (!expanded || withdrawn.length === 0)) {
    if (!expanded) return null;
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
        <Icon icon="shield-check" className="h-4 w-4" />
        {data.blackout_count === 0
          ? "No required sessions yet. Mark them in Agenda by clicking a tile or a Session Bank session."
          : "No absences overlap a required session."}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50/70 p-3">
      <button type="button" className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen((o) => !o)}>
        <span className="flex items-center gap-2 text-sm font-semibold text-red-800">
          <Icon icon="shield-alert" className="h-4 w-4" />
          {openConflicts.length} approved absence{openConflicts.length === 1 ? "" : "s"} overlap a required session
        </span>
        <Icon icon={open ? "chevron-up" : "chevron-down"} className="h-4 w-4 text-red-700" />
      </button>
      <p className="mt-0.5 text-xs text-red-800/80">
        These cAMPers see a notice asking them to reschedule and withdraw the absence. You can also withdraw it for them.
      </p>

      {open && (
        <ul className="mt-2 space-y-1.5">
          {openConflicts.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-background px-2.5 py-2 text-xs">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">
                  <button type="button" className="hover:underline" onClick={() => onCamperClick?.(c.camper_id)}>
                    {c.camper_name}
                  </button>
                  {c.team_name && <span className="font-normal text-muted-foreground"> · {c.team_name}</span>}
                  <span className="font-normal text-muted-foreground"> · {c.reason || "No reason"}</span>
                </p>
                <p className="text-muted-foreground">
                  Away {new Date(c.start_time).toLocaleString([], { weekday: "short", hour: "numeric", minute: "2-digit" })} ({formatDuration(minutesBetween(c.start_time, c.end_time))})
                  {" · overlaps "}
                  <span className="font-medium text-red-700">{c.sessions.map((s) => `${s.title} (${blackoutWhen(s)})`).join("; ")}</span>
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${c.blackout_ack_at ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}
              >
                {c.blackout_ack_at ? "Seen, kept it" : "Not seen yet"}
              </span>
              <Button size="sm" variant="outline" className="h-7 text-xs" disabled={busyId === c.id} onClick={() => withdraw(c.id, c.camper_name)}>
                {busyId === c.id ? "Withdrawing…" : "Withdraw"}
              </Button>
            </li>
          ))}
          {expanded && withdrawn.length > 0 && (
            <li className="pt-1 text-[11px] text-muted-foreground">
              Resolved: {withdrawn.map((c) => c.camper_name).join(", ")} withdrew {withdrawn.length === 1 ? "their absence" : "absences"}.
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
