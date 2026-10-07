import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useApi } from "@/hooks/useApi";
import { useApiData } from "@/hooks/useApiData";
import { toast } from "sonner";
import NewCohortDialog from "@/components/NewCohortDialog/index.js";
import { refreshCohortData, errorMessage } from "@/lib/cohortRefresh";

type Props = {
  legacyWallNumber: number | null;
  onChanged: () => void;
};

/** Shown after cAMP closes: add the cohort to the Legacy Wall, then start the next one. */
export default function CohortWrapUpCard({ legacyWallNumber, onChanged }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: cohortsData } = useApiData("GetCohorts", {});
  const { run: archive, loading: archiving } = useApi("ArchiveCohortToLegacyWall");
  const activeName = cohortsData?.active_cohort?.name ?? null;
  const archived = legacyWallNumber !== null;

  const handleArchive = useCallback(async () => {
    try {
      const result = await archive({});
      if (result?.archived) {
        toast.success(`${result.message} ${result.teams_archived} teams, ${result.members_archived} cAMPers.`);
      } else {
        toast.info(result?.message ?? "Nothing to archive.");
      }
      await refreshCohortData();
      onChanged();
    } catch (error) {
      toast.error("Couldn't add to the Legacy Wall: " + errorMessage(error));
    }
  }, [archive, onChanged]);

  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
        <Icon icon="archive" className="w-4 h-4 text-emerald-700" />
        Wrap up {activeName ?? "this cohort"}
      </h3>
      <p className="text-xs text-muted-foreground mt-1 mb-4">
        Save the final standings to the Legacy Wall, then start the next cohort.
      </p>

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Icon icon={archived ? "circle-check" : "landmark"} className={`w-4 h-4 ${archived ? "text-emerald-600" : "text-muted-foreground"}`} />
            {archived ? `On the Legacy Wall as cAMP #${legacyWallNumber}` : "Add teams and final points to the Legacy Wall"}
          </div>
          {!archived && (
            <Button size="sm" variant="outline" onClick={handleArchive} disabled={archiving}>
              {archiving ? <Icon icon="loader-2" className="w-4 h-4 mr-1 animate-spin" /> : <Icon icon="landmark" className="w-4 h-4 mr-1" />}
              Add to Legacy Wall
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Icon icon="tent" className="w-4 h-4 text-muted-foreground" />
            Start the next cohort
          </div>
          <Button
            size="sm"
            onClick={() => setDialogOpen(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Icon icon="plus" className="w-4 h-4 mr-1" />
            Start next cohort
          </Button>
        </div>
      </div>

      <NewCohortDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentCohortName={activeName}
        legacyWallPending={!archived}
        onCreated={onChanged}
      />
    </Card>
  );
}
