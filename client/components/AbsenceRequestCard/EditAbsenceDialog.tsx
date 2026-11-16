import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useApi } from "@/hooks/useApi";
import { formatDuration, toLocalInputValue } from "@/lib/absences.js";

export type EditableAbsence = { id: number; reason: string | null; start_time: string; end_time: string };

type Props = {
  absence: EditableAbsence | null;
  onClose: () => void;
  onSaved: () => void;
};

function errorText(err: unknown): string {
  if (typeof err === "string") return err;
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err) return String((err as { message: unknown }).message);
  return "Request failed";
}

/** Change the reason or time of an absence the cAMPer already logged. */
export default function EditAbsenceDialog({ absence, onClose, onSaved }: Props) {
  const { run: updateAbsence, loading } = useApi("UpdateAbsenceRequest");
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  useEffect(() => {
    if (!absence) return;
    setReason(absence.reason ?? "");
    setStart(toLocalInputValue(new Date(absence.start_time)));
    setEnd(toLocalInputValue(new Date(absence.end_time)));
  }, [absence]);

  const minutes = useMemo(() => {
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    return Number.isFinite(s) && Number.isFinite(e) && e > s ? Math.round((e - s) / 60000) : 0;
  }, [start, end]);

  const canSave = !!absence && reason.trim().length >= 3 && minutes > 0 && !loading;

  const handleSave = useCallback(async () => {
    if (!absence || !canSave) return;
    try {
      const res = await updateAbsence({
        absence_id: absence.id,
        start_time: new Date(start).toISOString(),
        end_time: new Date(end).toISOString(),
        reason: reason.trim(),
      });
      if (res?.error === "blackout") {
        toast.error(`That time overlaps a required session: ${res.blackout_sessions.map((s) => s.title).join(", ")}`);
        return;
      }
      if (res?.error === "camp_closed") {
        toast.error("cAMP is closed, so absences can't be changed.");
        return;
      }
      toast.success("Absence updated.");
      onSaved();
    } catch (err) {
      toast.error("Could not update absence: " + errorText(err));
    }
  }, [absence, canSave, updateAbsence, start, end, reason, onSaved]);

  return (
    <Dialog open={absence !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit absence</DialogTitle>
          <DialogDescription>Update the reason or time. It still counts as the same absence.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2 flex flex-col gap-1.5">
            <Label className="text-xs">Reason *</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
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
        <p className="text-xs text-muted-foreground">
          {minutes > 0 ? <>Total time away: <b className="text-foreground">{formatDuration(minutes)}</b></> : <span className="text-destructive">End time must be after the start time</span>}
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={!canSave}>{loading ? "Saving..." : "Save changes"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
