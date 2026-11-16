import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  reason: string | null;
  open: boolean;
  removing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Asks before removing an absence. Removed absences stop counting toward the 3. */
export default function RemoveAbsenceDialog({ reason, open, removing, onCancel, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove this absence?</DialogTitle>
          <DialogDescription>
            "{reason ?? "No reason"}" will be removed. It won't count toward your 3 excused absences, and your attendance bonus goes back up.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={removing}>Keep it</Button>
          <Button variant="destructive" onClick={onConfirm} disabled={removing}>{removing ? "Removing..." : "Remove"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
