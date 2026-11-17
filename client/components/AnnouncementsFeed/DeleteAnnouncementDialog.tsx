import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Props = {
  title: string | null;
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Asks before a counselor deletes an announcement. */
export default function DeleteAnnouncementDialog({ title, open, onCancel, onConfirm }: Props) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete this announcement?</DialogTitle>
          <DialogDescription>
            "{title ?? "Announcement"}" will be removed for everyone. This can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Keep it</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
