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
  name: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/** Asks before removing a cAMPer from the cohort. Their data is kept so they can be restored. */
export default function ConfirmRemoveCamperDialog({ name, onCancel, onConfirm }: Props) {
  return (
    <Dialog open={name !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {name} from cAMP?</DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                They'll disappear from the roster, leaderboard, teams, and manager dashboards, come off
                their team, and won't be able to earn points. They'll be marked Declined on the new-hire list.
              </p>
              <p>
                Their profile and points are kept. If they register again, they'll show up under
                Removed cAMPers so you can restore them.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Remove cAMPer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
