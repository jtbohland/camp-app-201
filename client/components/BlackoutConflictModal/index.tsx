import { useCallback, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { BLACKOUT_REMINDER, blackoutWhen } from "@/lib/blackouts.js";

function errMsg(err: unknown) {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * cAMPers: an absence they already logged overlaps a session that's now required.
 * Opens on any page until each one is withdrawn or acknowledged.
 */
export default function BlackoutConflictModal({ camperId }: { camperId: number }) {
  const { data, refetch } = useApiData("GetMyBlackouts", {}, { enabled: camperId > 0, refetchInterval: 120_000, staleTime: 30_000 });
  const { run: respond } = useApi("RespondToBlackoutConflict");
  const [busy, setBusy] = useState<string | null>(null);

  const pending = (data?.conflicts ?? []).filter((c) => !c.blackout_ack_at);
  const current = pending[0];

  const act = useCallback(
    async (action: "withdraw" | "acknowledge") => {
      if (!current) return;
      setBusy(action);
      try {
        await respond({ absence_id: current.id, action });
        toast.success(
          action === "withdraw"
            ? "Absence withdrawn. It no longer counts toward your 3, and your attendance bonus is back."
            : "Got it. Please talk to a counselor before cAMP."
        );
        await refetch();
        void queryClient.invalidateQueries("GetAbsenceRequests");
      } catch (err) {
        toast.error("Couldn't save: " + errMsg(err));
      }
      setBusy(null);
    },
    [current, respond, refetch]
  );

  if (!current) return null;

  return (
    <Dialog open onOpenChange={() => { /* must choose an option */ }}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon icon="shield-alert" className="h-5 w-5 text-red-600" />
            Your absence overlaps a required session
          </DialogTitle>
          <DialogDescription className="pt-1">
            Since you logged it, this time became a blackout period. Your presence is mandatory, so please reschedule your other call or
            meeting and withdraw the absence.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Your absence</p>
            <p className="text-sm font-medium text-foreground">{current.reason || "No reason given"}</p>
            <p className="text-xs text-muted-foreground">
              {fmt(current.start_time)} – {new Date(current.end_time).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-[11px] font-medium uppercase tracking-wide text-red-700">Required</p>
            {current.sessions.map((s) => (
              <p key={s.agenda_id} className="text-sm text-red-900">
                <span className="font-semibold">{s.title}</span>
                <span className="text-xs text-red-800/80"> · {blackoutWhen(s)}</span>
              </p>
            ))}
          </div>
        </div>

        <p className="rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{BLACKOUT_REMINDER}</p>
        {pending.length > 1 && <p className="text-[11px] text-muted-foreground">1 of {pending.length} absences to review.</p>}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" disabled={!!busy} onClick={() => act("acknowledge")}>
            {busy === "acknowledge" ? "Saving…" : "I can't move it, I'll talk to a counselor"}
          </Button>
          <Button disabled={!!busy} onClick={() => act("withdraw")} className="bg-red-600 text-white hover:bg-red-700">
            {busy === "withdraw" ? "Withdrawing…" : "Withdraw absence"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
