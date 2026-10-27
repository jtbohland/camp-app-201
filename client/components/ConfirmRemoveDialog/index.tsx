import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  title: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Asks before taking a session off the agenda. It stays in the Session Bank. */
export default function ConfirmRemoveDialog({ title, onCancel, onConfirm }: Props) {
  return (
    <Dialog open={title !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Remove from agenda?</DialogTitle>
          <DialogDescription>
            "{title}" will be taken off the schedule. It stays in the Session Bank so you can add it back later.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Remove</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
