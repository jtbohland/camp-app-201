import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { queryClient } from "@superblocksteam/library";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { errorText } from "@/lib/teamHub";

type AuditRow = {
  camper_id: number;
  name: string;
  total: number;
  log_sum: number;
  prework_done: number;
  prework_logged: number;
  issues: string[];
  ok: boolean;
};

/**
 * Point Log › Points Audit: checks every active cAMPer against the scoring rules
 * (each finished pre-work item has exactly one award, registration/profile/early-bird given,
 * total = point history) and lets a counselor fix anything owed in one click.
 */
export default function PointsAuditPanel({ onCamperClick }: { onCamperClick?: (id: number) => void }) {
  const { data, loading, fetching, isError, error, refetch } = useApiData("AuditCamperPoints", {});
  const { run: fix, loading: fixing } = useApi("FixCamperPoints");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const rows = (data?.campers ?? []) as AuditRow[];
  const flagged = useMemo(() => rows.filter((r) => !r.ok), [rows]);
  const visible = showAll ? rows : flagged;

  const handleFix = useCallback(
    async (camperId: number | null) => {
      try {
        const res = await fix({ camper_id: camperId });
        setConfirmOpen(false);
        await Promise.all([refetch(), queryClient.invalidateQueries("GetPointLog")]);
        const remaining = (res?.campers ?? []).filter((c: AuditRow) => !c.ok).length;
        if (!res || res.fixed === 0) {
          toast.success(remaining ? "Nothing more can be fixed automatically. Review the rows still flagged." : "Every total already checks out.");
        } else {
          toast.success(`Fixed ${res.fixed} cAMPer${res.fixed === 1 ? "" : "s"} (${res.points_added >= 0 ? "+" : ""}${res.points_added} pts)`);
        }
      } catch (err) {
        toast.error("Couldn't fix points: " + errorText(err));
      }
    },
    [fix, refetch],
  );

  return (
    <Card className="p-5 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Icon icon="shield-check" className="w-4 h-4 text-camp-green" />
            Points Audit
          </h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
            Checks every cAMPer: each finished pre-work item has exactly one award, registration, profile, and early-bird
            points were given, and their total equals their point history.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={fetching}>
            <Icon icon="refresh-cw" className={`w-3.5 h-3.5 mr-1.5 ${fetching ? "animate-spin" : ""}`} />
            Re-check
          </Button>
          <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={fixing || flagged.length === 0}>
            <Icon icon="wrench" className="w-3.5 h-3.5 mr-1.5" />
            Fix all ({flagged.length})
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : isError && !data ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <span>Couldn't run the audit. {errorText(error)}</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>Try again</Button>
        </div>
      ) : (
        <div className={fetching ? "opacity-70" : ""}>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {flagged.length === 0 ? (
                <span className="font-medium text-camp-green">All {rows.length} cAMPers check out.</span>
              ) : (
                <>
                  <span className="font-semibold text-red-600">{flagged.length}</span> of {rows.length} cAMPers need a fix
                </>
              )}
            </span>
            <button className="font-medium text-primary hover:underline" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show only issues" : `Show all ${rows.length}`}
            </button>
          </div>
          {visible.length > 0 && (
            <div className="divide-y divide-border rounded-lg border border-border">
              {visible.slice(0, 50).map((r) => (
                <div key={r.camper_id} className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <button
                      className="text-sm font-medium hover:underline text-left"
                      onClick={() => onCamperClick?.(r.camper_id)}
                    >
                      {r.name || `cAMPer #${r.camper_id}`}
                    </button>
                    <p className="text-[11px] text-muted-foreground">
                      {r.total} pts · pre-work {r.prework_logged}/{r.prework_done} awarded
                    </p>
                    {r.issues.map((issue) => (
                      <p key={issue} className="text-[11px] text-red-600">{issue}</p>
                    ))}
                  </div>
                  {r.ok ? (
                    <span className="text-xs font-medium text-camp-green flex items-center gap-1">
                      <Icon icon="check" className="w-3.5 h-3.5" /> OK
                    </span>
                  ) : (
                    <Button variant="outline" size="sm" disabled={fixing} onClick={() => handleFix(r.camper_id)}>
                      Fix
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
          {visible.length > 50 && (
            <p className="mt-2 text-[11px] text-muted-foreground">Showing the first 50. Fix all covers everyone.</p>
          )}
        </div>
      )}

      <Dialog open={confirmOpen} onOpenChange={(o) => !fixing && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fix points for {flagged.length} cAMPer{flagged.length === 1 ? "" : "s"}?</DialogTitle>
            <DialogDescription>
              Each one gets any points the rules say they earned but never received, and their total is set to match
              their point history. Every change is added to the Point Log as "points_audit", so it's traceable.
              Nothing is ever awarded twice.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={fixing}>Cancel</Button>
            <Button onClick={() => handleFix(null)} disabled={fixing}>
              {fixing ? "Fixing…" : "Fix points"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
