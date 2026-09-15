import { useState, useCallback, useEffect } from "react";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { toast } from "sonner";

interface Props {
  camperId: number;
  isAdmin: boolean;
}

export default function CloseCampModal({ camperId, isAdmin }: Props) {
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem("close_camp_dismissed") === "1");
  const [confirming, setConfirming] = useState(false);

  const { data: status, refetch } = useApiData("GetCloseCampStatus", {}, {
    enabled: isAdmin,
    refetchInterval: 10000, // Poll every 10s
    staleTime: 5000,
  });

  const { run: closeCamp, loading: closing } = useApi("CloseCamp");

  const campClosed = status?.camp_closed ?? false;
  const readyToClose = status?.camp_ready_to_close ?? false;
  const showModal = isAdmin && readyToClose && !campClosed && !dismissed;

  // Reset dismissed if camp closes (another counselor clicked it)
  useEffect(() => {
    if (campClosed) setDismissed(false);
  }, [campClosed]);

  const handleClose = useCallback(async () => {
    try {
      const result = await closeCamp({ closer_camper_id: camperId });
      if (result?.already_closed) {
        toast.info("Another counselor already closed cAMP!");
      } else {
        toast.success(result?.message ?? "🏕️ cAMP is officially closed!");
      }
      setConfirming(false);
      await refetch();
    } catch (error) {
      const message = error && typeof error === "object" && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);
      toast.error("Error closing cAMP: " + message);
    }
  }, [closeCamp, camperId, refetch]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-background rounded-2xl shadow-2xl border border-border max-w-lg w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white text-center">
          <div className="text-4xl mb-2">🏕️</div>
          <h2 className="text-xl font-bold">That's a Wrap!</h2>
          <p className="text-sm text-white/90 mt-1">
            All Mini EBR scores are in — camp points are ready to be finalized.
          </p>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Pressing <strong>Close cAMP</strong> will:</p>
            <ul className="space-y-1 ml-1">
              <li className="flex items-start gap-2">
                <Icon icon="lock" className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                <span>Freeze all points — no more earning</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="trophy" className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                <span>Calculate <strong>cAMP-V-P</strong> &amp; <strong>cAMP Champ</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="award" className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                <span>Award milestone badges (Summit Seeker, Peak Performer, Legend of the Lake)</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="star" className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                <span>Award <strong>Wheel Dealer</strong> to the Top Dealer</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="mountain" className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                <span>Check <strong>Alpine Legend</strong> eligibility</span>
              </li>
              <li className="flex items-start gap-2">
                <Icon icon="eye-off" className="w-4 h-4 mt-0.5 text-amber-600 shrink-0" />
                <span>Hide leaderboards for the podium ceremony reveal</span>
              </li>
            </ul>
          </div>

          {!confirming ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { sessionStorage.setItem("close_camp_dismissed", "1"); setDismissed(true); }}
              >
                Not Yet
              </Button>
              <Button
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                onClick={() => setConfirming(true)}
              >
                <Icon icon="flag" className="w-4 h-4 mr-1" />
                Close cAMP
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                <strong>Are you sure?</strong> This action cannot be undone. All points and standings will be finalized.
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setConfirming(false)}
                  disabled={closing}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 text-white hover:bg-red-700"
                  onClick={handleClose}
                  disabled={closing}
                >
                  {closing ? (
                    <>
                      <Icon icon="loader-2" className="w-4 h-4 mr-1 animate-spin" />
                      Closing...
                    </>
                  ) : (
                    <>
                      <Icon icon="check" className="w-4 h-4 mr-1" />
                      Confirm — Close cAMP
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <p className="text-xs text-center text-muted-foreground">
            {status?.scores_submitted ?? 0}/{status?.scores_needed ?? 0} Mini EBR rubrics submitted
          </p>
        </div>
      </div>
    </div>
  );
}
