import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";

export type PoolCamper = {
  name: string;
  camper_id: number | null;
  /** Manager named on the cAMPer's record (who we expect to claim them). */
  expected_manager: string | null;
  /** Registered manager(s) who claimed this cAMPer, or null. */
  claimed_by: string | null;
};

/**
 * Every Accepted cAMPer. Unclaimed ones sit in the pool; once a manager claims them they leave the
 * pool and show under "Claimed" with the manager's name (and in that manager's row below).
 */
export default function CamperClaimPool({ pool }: { pool: PoolCamper[] }) {
  const [showClaimed, setShowClaimed] = useState(false);
  const unclaimed = useMemo(() => pool.filter((p) => !p.claimed_by), [pool]);
  const claimed = useMemo(() => pool.filter((p) => !!p.claimed_by), [pool]);
  const pct = pool.length ? Math.round((claimed.length / pool.length) * 100) : 0;

  return (
    <Card className="bg-card border-border">
      <div className="border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold text-foreground">
            <Icon icon="users" className="h-4 w-4" />
            cAMPer Pool
            <Badge className="border-amber-200 bg-amber-100 text-xs text-amber-800">{unclaimed.length} unclaimed</Badge>
          </h3>
          <span className="text-xs font-medium tabular-nums text-muted-foreground">
            {claimed.length} of {pool.length} claimed by a manager
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-camp-green transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {pool.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No Accepted cAMPers yet. Mark invites Accepted in Cohort Management to fill the pool.
        </div>
      ) : unclaimed.length === 0 ? (
        <div className="flex items-center justify-center gap-2 p-6 text-sm text-camp-green">
          <Icon icon="circle-check" className="h-4 w-4" /> Every cAMPer has been claimed by a manager.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 p-4">
          {unclaimed.map((p) => (
            <div
              key={`${p.camper_id ?? "x"}-${p.name}`}
              className="flex flex-col rounded-md border border-amber-200 bg-amber-50/60 px-2.5 py-1.5 dark:bg-amber-900/10"
            >
              <span className="text-xs font-medium text-foreground">{p.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {p.expected_manager ? `Manager: ${p.expected_manager}` : "No manager on file"}
              </span>
            </div>
          ))}
        </div>
      )}

      {claimed.length > 0 && (
        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setShowClaimed((v) => !v)}
            className="flex items-center gap-1 text-xs font-medium text-camp-green hover:underline"
          >
            <Icon icon={showClaimed ? "chevron-down" : "chevron-right"} className="h-3.5 w-3.5" />
            Claimed ({claimed.length})
          </button>
          {showClaimed && (
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {claimed.map((p) => (
                <div
                  key={`${p.camper_id ?? "x"}-${p.name}`}
                  className="flex items-center gap-1.5 rounded-md border border-camp-green/20 bg-camp-green/5 px-2.5 py-1.5 text-xs"
                >
                  <Icon icon="circle-check" className="h-3.5 w-3.5 flex-shrink-0 text-camp-green" />
                  <span className="font-medium text-foreground">{p.name}</span>
                  <Icon icon="arrow-right" className="h-3 w-3 flex-shrink-0 text-muted-foreground/60" />
                  <span className="truncate text-muted-foreground">{p.claimed_by}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
