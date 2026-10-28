import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useApiData } from "@/hooks/useApiData";
import { useApi } from "@/hooks/useApi";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { errorMessage } from "@/lib/cohortRefresh";
import { refreshRosterViews } from "@/lib/camperRemoval";

function formatDate(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** People counselors removed from cAMP. Restore brings them back into the active cohort with their points. */
export default function RemovedCampersList({ canEdit }: { canEdit: boolean }) {
  const { data, loading, fetching } = useApiData("GetRemovedCampers", {});
  const { run: restore } = useApi("RestoreCamper");
  const [restoringId, setRestoringId] = useState<number | null>(null);

  const handleRestore = useCallback(
    async (id: number, name: string) => {
      setRestoringId(id);
      try {
        await restore({ camper_id: id });
        toast.success(`${name} is back in cAMP with their points.`);
        await refreshRosterViews();
      } catch (error) {
        toast.error("Couldn't restore: " + errorMessage(error));
      } finally {
        setRestoringId(null);
      }
    },
    [restore]
  );

  const campers = data?.campers ?? [];
  if (loading || campers.length === 0) return null;
  const waiting = campers.filter((c) => c.rejoin_requested_at).length;

  return (
    <Card className={`mt-8 p-5 border shadow-sm ${fetching ? "opacity-70" : ""}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon icon="user-x" className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Removed cAMPers ({campers.length})</h3>
        {waiting > 0 && (
          <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            {waiting} waiting to rejoin
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Hidden from the app. Profiles and points are saved. Restore puts them back in the active cohort.
      </p>
      <div className="divide-y divide-border">
        {campers.map((c) => {
          const name = `${c.first_name} ${c.last_name}`;
          return (
            <div key={c.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{name}</span>
                  {c.rejoin_requested_at && (
                    <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full shrink-0">
                      Re-registered {formatDate(c.rejoin_requested_at)}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {c.email} · {c.points} pts saved · removed {formatDate(c.removed_at)}
                </p>
              </div>
              {canEdit && (
                <Button
                  size="sm"
                  variant={c.rejoin_requested_at ? "default" : "outline"}
                  disabled={restoringId !== null}
                  onClick={() => handleRestore(c.id, name)}
                >
                  <Icon icon={restoringId === c.id ? "loader-circle" : "undo-2"} className={`w-3.5 h-3.5 mr-1 ${restoringId === c.id ? "animate-spin" : ""}`} />
                  Restore
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}
