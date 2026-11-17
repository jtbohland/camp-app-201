import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useApi } from "@/hooks/useApi.js";
import { useApiData } from "@/hooks/useApiData.js";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import BackfillRow, { type BackfillPerson } from "./BackfillRow.js";

const errText = (e: unknown) =>
  e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);

function sessionLabel(s: { label: string; started_at: string; status: string }) {
  const when = new Date(s.started_at).toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
  });
  return `${s.label || "Check-in"} · ${when}${s.status === "active" ? " (live)" : ""}`;
}

/**
 * Counselors: back-fill a check-in for someone who missed it (or was late) for a reason they
 * couldn't control. No penalty and no solo points; the team race is re-checked so the team can score.
 */
export default function CheckInBackfill({ onChanged }: { onChanged?: () => void }) {
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { data, loading, fetching, refetch } = useApiData(
    "GetCheckInBackfill",
    { session_id: sessionId },
    { refetchInterval: 10_000 }
  );
  const { run: backfill } = useApi("BackfillCheckIn");

  const chosen = data?.session_id ?? null;
  const people = (data?.people ?? []) as BackfillPerson[];

  const handleBackfill = useCallback(
    async (p: BackfillPerson) => {
      if (!chosen) return;
      setBusyId(p.camper_id);
      try {
        const res = await backfill({ session_id: chosen, camper_id: p.camper_id });
        if (!res) throw new Error("No response");
        const team =
          res.team_place && res.team_place <= 3
            ? ` Team finished ${res.team_place === 1 ? "1st" : res.team_place === 2 ? "2nd" : "3rd"}!`
            : res.team_complete
            ? " Team is all in."
            : "";
        toast.success(
          (res.result === "penalty_removed"
            ? `Late penalty removed for ${p.name} (+${res.points_change}).`
            : `${p.name} back-filled, no penalty.`) + team
        );
        await refetch();
        onChanged?.();
      } catch (e) {
        toast.error("Couldn't back-fill: " + errText(e));
      } finally {
        setBusyId(null);
      }
    },
    [chosen, backfill, refetch, onChanged]
  );

  return (
    <Card className="w-full max-w-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-1">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Icon icon="user-check" className="w-4 h-4 text-primary" />
          Back-fill a check-in
        </h3>
        {fetching && !loading && <span className="text-[10px] text-muted-foreground">Updating…</span>}
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        For someone who couldn't check in for a reason out of their control. No penalty, no solo points, and their team still counts them for the race.
      </p>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (data?.sessions ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">No check-ins yet this cohort.</p>
      ) : (
        <>
          <Select value={chosen ? String(chosen) : undefined} onValueChange={(v) => setSessionId(Number(v))}>
            <SelectTrigger className="mb-2">
              <SelectValue placeholder="Choose a check-in" />
            </SelectTrigger>
            <SelectContent>
              {(data?.sessions ?? []).map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {sessionLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className={`max-h-72 overflow-auto divide-y divide-border ${fetching ? "opacity-70" : ""}`}>
            {people.length === 0 ? (
              <p className="py-3 text-sm text-muted-foreground flex items-center gap-2">
                <Icon icon="check-circle" className="w-4 h-4 text-green-600" />
                Everyone is checked in or excused.
              </p>
            ) : (
              people.map((p) => (
                <BackfillRow key={p.camper_id} person={p} busy={busyId === p.camper_id} onBackfill={handleBackfill} />
              ))
            )}
          </div>
        </>
      )}
    </Card>
  );
}
