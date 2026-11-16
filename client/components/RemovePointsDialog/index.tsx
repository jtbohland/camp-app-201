import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/useApi";
import { errorMessage } from "@/lib/cohortRefresh";
import RemoveEntryList from "./RemoveEntryList.js";

export type RemovableEntry = {
  id: number;
  points: number;
  reason: string | null;
  camperName?: string;
};

type Props = {
  /** One or more entries to remove; null/empty keeps the dialog closed. */
  entries: RemovableEntry[] | null;
  onClose: () => void;
  /** Called after a successful removal (e.g. to clear a selection). */
  onRemoved?: () => void;
};

/** Everything that shows a cAMPer's points or history. */
const POINT_VIEWS = [
  "GetPointLog",
  "GetCamperReportCard",
  "GetCamperActivity",
  "GetAdminCampers",
  "GetLeaderboard",
  "GetMyStanding",
  "GetPointsBreakdown",
  "AuditCamperPoints",
  "GetPreworkReminder",
  "GetCamperPreworkChecklist",
];

const signed = (n: number) => (n > 0 ? `+${n}` : String(n));

/** Counselor confirms removing one or more wrong awards or deductions, with one shared reason. */
export default function RemovePointsDialog({ entries, onClose, onRemoved }: Props) {
  const { run: reverse, loading } = useApi("ReversePointEntry");
  const [note, setNote] = useState("");
  const list = entries ?? [];
  const open = list.length > 0;
  const multi = list.length > 1;

  useEffect(() => {
    if (open) setNote("");
  }, [open]);

  // Net change to totals: removing +10 takes 10 off, removing -5 gives 5 back.
  const change = -list.reduce((sum, e) => sum + e.points, 0);
  const allLosses = list.every((e) => e.points < 0);
  const names = [...new Set(list.map((e) => e.camperName).filter(Boolean))] as string[];

  const handleConfirm = useCallback(async () => {
    if (!open) return;
    try {
      const res = await reverse({ entry_ids: list.map((e) => e.id), note: note.trim() });
      await Promise.all(POINT_VIEWS.map((n) => queryClient.invalidateQueries(n)));
      const removed = res?.removed ?? list.length;
      const skipped = res?.skipped ?? [];
      const who = names.length === 1 ? ` for ${names[0]}` : names.length > 1 ? ` across ${names.length} cAMPers` : "";
      const count = removed === 1 ? "1 entry" : `${removed} entries`;
      toast.success(`Removed ${count}. ${signed(res?.points_change ?? change)} pts${who}.`);
      if (skipped.length > 0) {
        toast.warning(`${skipped.length} skipped: ${skipped[0].reason}`);
      }
      onRemoved?.();
      onClose();
    } catch (e) {
      toast.error("Couldn't remove points: " + errorMessage(e));
    }
  }, [open, list, note, names, reverse, onClose, onRemoved]);

  const single = list[0];
  const title = multi
    ? `Remove ${list.length} entries?`
    : allLosses
      ? "Give these points back?"
      : "Remove these points?";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {multi ? (
              <>
                {names.length === 1 ? `${names[0]}: ` : names.length > 1 ? `${names.length} cAMPers · ` : ""}
                net <span className="font-semibold text-foreground">{signed(change)} pts</span> to their total
                {names.length > 1 ? "s" : ""}.
              </>
            ) : single ? (
              <>
                {single.camperName ? `${single.camperName}: ` : ""}
                <span className="font-semibold text-foreground">{signed(single.points)}</span> for "{single.reason || "Points"}".
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          {multi && <RemoveEntryList entries={list} showNames={names.length > 1} />}
          <p className="text-muted-foreground">
            {multi
              ? "Each original entry stays in the history, marked as removed."
              : `${Math.abs(single?.points ?? 0)} pts will be ${allLosses ? "added back to" : "taken off"} their total. The original entry stays in the history, marked as removed.`}
          </p>
          <label htmlFor="remove-points-note" className="block text-xs font-medium text-foreground">
            Why? (shown in the point log{multi ? " for every entry" : ""})
          </label>
          <Textarea
            id="remove-points-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder={allLosses ? "e.g. Penalty applied by mistake" : "e.g. Awarded twice"}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading || note.trim().length < 3}>
            {loading ? "Removing…" : multi ? `Remove ${list.length} entries` : allLosses ? "Give points back" : "Remove points"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
