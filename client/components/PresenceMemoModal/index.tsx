import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { useApiData } from "@/hooks/useApiData";

const DISMISS_KEY = "camp201_presence_memo_seen";

/**
 * Memo for cAMPers with 7+ late/missed check-ins: please see a counselor about presence and
 * accountability. Shown once per strike count per browser session (it comes back if they miss more).
 * Only active from the cohort set in config `presence_memo_min_cohort_id` on.
 */
export default function PresenceMemoModal() {
  const { data } = useApiData("GetMyPresenceStatus", {}, { refetchInterval: 60_000, staleTime: 30_000 });
  const [seen, setSeen] = useState<number>(() => Number(sessionStorage.getItem(DISMISS_KEY) ?? 0));

  if (!data?.memo_required || data.strikes <= seen) return null;

  const acknowledge = () => {
    sessionStorage.setItem(DISMISS_KEY, String(data.strikes));
    setSeen(data.strikes);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <Icon icon="user-check" className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">Please see a counselor</h3>
            <p className="text-sm text-muted-foreground">Presence &amp; accountability</p>
          </div>
        </div>
        <p className="text-sm text-foreground/80 mb-3">
          You've been late for or missed <span className="font-bold text-red-500">{data.strikes} check-ins</span> this cAMP
          ({data.penalty_points} pts so far). Please find a counselor today to talk about being present and on time.
        </p>
        <p className="text-xs text-muted-foreground mb-4">
          From here on, every late or missed check-in costs 10 points. Need to step away? Request an absence ahead of time and it won't count.
        </p>
        <Button onClick={acknowledge} className="w-full bg-red-600 hover:bg-red-700 text-white">
          Got it, I'll see a counselor
        </Button>
      </div>
    </div>
  );
}
