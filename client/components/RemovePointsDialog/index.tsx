import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useApi } from "@/hooks/useApi";
import { errorMessage } from "@/lib/cohortRefresh";

export type RemovableEntry = {
  id: number;
  points: number;
  reason: string | null;
  camperName?: string;
};

type Props = {
  entry: RemovableEntry | null;
  onClose: () => void;
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

/** Counselor confirms removing a wrong award or deduction, with a short reason. */
export default function RemovePointsDialog({ entry, onClose }: Props) {
  const { run: reverse, loading } = useApi("ReversePointEntry");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (entry) setNote("");
  }, [entry]);

  const handleConfirm = useCallback(async () => {
    if (!entry) return;
    try {
      const res = await reverse({ entry_id: entry.id, note: note.trim() });
      await Promise.all(POINT_VIEWS.map((n) => queryClient.invalidateQueries(n)));
      const change = res?.points_change ?? -entry.points;
      toast.success(`Removed. ${change > 0 ? `+${change}` : change} pts${entry.camperName ? ` for ${entry.camperName}` : ""}.`);
      onClose();
    } catch (e) {
      toast.error("Couldn't remove points: " + errorMessage(e));
    }
  }, [entry, note, reverse, onClose]);

  const isLoss = (entry?.points ?? 0) < 0;
  const amount = Math.abs(entry?.points ?? 0);

  return (
    <Dialog open={!!entry} onOpenChange={(o) => !o && !loading && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isLoss ? "Give these points back?" : "Remove these points?"}</DialogTitle>
          <DialogDescription>
            {entry?.camperName ? `${entry.camperName}: ` : ""}
            <span className="font-semibold text-foreground">{entry && entry.points > 0 ? `+${entry.points}` : entry?.points}</span>{" "}
            for "{entry?.reason || "Points"}".
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">
            {isLoss
              ? `${amount} pts will be added back to their total.`
              : `${amount} pts will be taken off their total.`}{" "}
            The original entry stays in the history, marked as removed.
          </p>
          <label htmlFor="remove-points-note" className="block text-xs font-medium text-foreground">
            Why? (shown in the point log)
          </label>
          <Textarea
            id="remove-points-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={300}
            placeholder={isLoss ? "e.g. Penalty applied by mistake" : "e.g. Awarded twice"}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading || note.trim().length < 3}>
            {loading ? "Removing…" : isLoss ? "Give points back" : "Remove points"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
