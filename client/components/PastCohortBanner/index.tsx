import { useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useCohortView } from "@/hooks/useCohortView";
import { errorMessage } from "@/lib/cohortRefresh";

/** Shown on every page while a counselor is viewing a past cohort. */
export default function PastCohortBanner() {
  const { isPast, cohortName, hasSnapshot, switchTo, switching } = useCohortView();

  const handleBack = useCallback(async () => {
    try {
      await switchTo(null);
    } catch (e) {
      toast.error("Couldn't switch back: " + errorMessage(e));
    }
  }, [switchTo]);

  if (!isPast) return null;

  return (
    <div
      role="status"
      className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 bg-amber-50 border-b border-amber-200 text-amber-900 text-sm shrink-0"
    >
      <Icon icon="history" className="w-4 h-4 shrink-0" />
      <span>
        Viewing <strong>{cohortName ?? "a past cohort"}</strong>, read-only. Only you see this; cAMPers see the active cohort.
        {!hasSnapshot && " Final standings weren't saved for this cohort, so points show as they are now."}
      </span>
      <Button
        size="sm"
        variant="outline"
        className="ml-auto h-7 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
        onClick={handleBack}
        disabled={switching}
      >
        {switching ? <Icon icon="loader-2" className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Icon icon="arrow-left" className="w-3.5 h-3.5 mr-1" />}
        Back to active cohort
      </Button>
    </div>
  );
}
