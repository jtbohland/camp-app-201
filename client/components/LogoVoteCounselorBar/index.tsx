import { useCallback, useState } from "react";
import { queryClient } from "@superblocksteam/library";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useApi } from "@/hooks/useApi.js";
import { errorMessage } from "@/lib/cohortRefresh";

type Props = {
  votingOpen: boolean;
  finalized: boolean;
  totalVoters: number;
  totalCampers: number;
  onChanged: () => void;
};

/** Counselor-only controls for the logo vote: open/pause voting, and close it to award points. */
export default function LogoVoteCounselorBar({ votingOpen, finalized, totalVoters, totalCampers, onChanged }: Props) {
  const { run: updateGate, loading: toggling } = useApi("UpdateFeatureGate");
  const { run: closeVoting, loading: closing } = useApi("CloseLogoVoting");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const refresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries("GetFeatureGates"),
      queryClient.invalidateQueries("GetTeams"),
    ]);
    onChanged();
  }, [onChanged]);

  const handleToggle = useCallback(async () => {
    try {
      await updateGate({ feature_key: "logo_voting", is_locked: votingOpen, unlock_at: null });
      toast.success(votingOpen ? "Logo voting paused for cAMPers" : "Logo voting is open for cAMPers 🗳️");
      await refresh();
    } catch (e) {
      toast.error("Couldn't update logo voting: " + errorMessage(e));
    }
  }, [updateGate, votingOpen, refresh]);

  const handleClose = useCallback(async () => {
    try {
      const result = await closeVoting({});
      if (result?.finalized) toast.success(result.message);
      else toast.info(result?.message ?? "Voting is already closed.");
      setConfirmOpen(false);
      await refresh();
    } catch (e) {
      toast.error("Couldn't close voting: " + errorMessage(e));
    }
  }, [closeVoting, refresh]);

  if (finalized) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white/70 px-3 py-2 text-xs text-amber-800">
        <Icon icon="lock" className="w-3.5 h-3.5" />
        Counselor view: voting is closed and points were awarded.
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-white/70 px-3 py-2">
      <div className="flex items-center gap-2 text-xs text-amber-900">
        <Icon icon={votingOpen ? "lock-open" : "lock"} className={`w-3.5 h-3.5 ${votingOpen ? "text-emerald-600" : "text-red-600"}`} />
        <span>
          <span className="font-semibold">Counselor view:</span>{" "}
          {votingOpen ? "voting is open for cAMPers" : "voting is locked (hidden from cAMPers)"} · {totalVoters}/{totalCampers} voted
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleToggle} disabled={toggling || closing}>
          <Icon icon={votingOpen ? "lock" : "lock-open"} className="w-3.5 h-3.5 mr-1" />
          {votingOpen ? "Lock voting" : "Unlock voting"}
        </Button>
        <Button
          size="sm"
          onClick={() => setConfirmOpen(true)}
          disabled={toggling || closing}
          className="bg-amber-600 text-white hover:bg-amber-700"
        >
          <Icon icon="trophy" className="w-3.5 h-3.5 mr-1" />
          Close voting & award points
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !closing && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close logo voting?</DialogTitle>
            <DialogDescription>
              {totalVoters} of {totalCampers} cAMPers have voted. Teams are ranked on the votes so far and get
              team points (1st +20, 2nd +15, 3rd +10, 4th +5). The top team gets the Best Logo award. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={closing}>
              Cancel
            </Button>
            <Button onClick={handleClose} disabled={closing} className="bg-amber-600 text-white hover:bg-amber-700">
              {closing ? "Closing…" : "Close & award points"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
