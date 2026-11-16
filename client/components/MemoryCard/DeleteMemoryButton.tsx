import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApi } from "@/hooks/useApi";
import { errorMessage } from "@/lib/cohortRefresh";

type Props = { memoryId: number; authorName: string; onDeleted: () => void };

/** Counselor-only: delete a post from the Memories feed, after confirming. */
export default function DeleteMemoryButton({ memoryId, authorName, onDeleted }: Props) {
  const [open, setOpen] = useState(false);
  const { run: deleteMemory, loading } = useApi("DeleteMemory");

  const confirm = useCallback(async () => {
    try {
      await deleteMemory({ memory_id: memoryId });
      toast.success("Post deleted");
      setOpen(false);
      onDeleted();
    } catch (e) {
      toast.error("Couldn't delete post: " + errorMessage(e));
    }
  }, [deleteMemory, memoryId, onDeleted]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Delete post (counselors only)"
        aria-label="Delete post"
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600"
      >
        <Icon icon="trash-2" className="h-3.5 w-3.5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete this post?</DialogTitle>
            <DialogDescription>
              {authorName}'s post and its reactions will be removed from Memories for everyone. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>Cancel</Button>
            <Button variant="destructive" onClick={confirm} disabled={loading}>
              {loading ? "Deleting…" : "Delete post"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
