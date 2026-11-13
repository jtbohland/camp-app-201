import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import type { HubItem } from "@/lib/teamHub";

type Props = {
  item: HubItem | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Confirms before a hub post is deleted. */
export default function HubDeleteDialog({ item, onCancel, onConfirm }: Props) {
  return (
    <Dialog open={item !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this post?</DialogTitle>
          <DialogDescription>
            “{item?.title}” will be removed from your Team Hub for everyone. This can't be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
