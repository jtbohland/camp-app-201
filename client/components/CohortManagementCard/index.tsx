import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useApiData } from "@/hooks/useApiData";
import NewHireManager from "@/components/NewHireManager/index.js";
import ActiveCohortBanner from "@/components/ActiveCohortBanner/index.js";
import CohortSetupStep from "@/components/CohortSetupStep/index.js";
import NewCohortDialog from "@/components/NewCohortDialog/index.js";
import type { IconName } from "lucide-react/dynamic";

type Props = {
  onNavigate: (view: string) => void;
};

const PROGRAM_SHORTCUTS: { view: string; label: string; icon: IconName }[] = [
  { view: "schedule", label: "Agenda", icon: "calendar" },
  { view: "presentations", label: "Activities", icon: "target" },
  { view: "settings", label: "Program settings", icon: "settings" },
];

/** Step-by-step setup for the active cohort: start, upload roster, review program, unlock sections. */
export default function CohortManagementCard({ onNavigate }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: cohortsData, loading } = useApiData("GetCohorts", {});
  const { data: status } = useApiData("GetCloseCampStatus", {}, { staleTime: 5000 });
  const { data: gatesData } = useApiData("GetFeatureGates", {});
  const active = cohortsData?.active_cohort ?? null;
  const { data: hiresData } = useApiData(
    "GetNewHires",
    { cohort_id: active?.id ?? 0, status: null },
    { enabled: !!active }
  );

  if (loading) {
    return (
      <div className="flex flex-col gap-4 max-w-4xl">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const campClosed = status?.camp_closed ?? false;
  const legacyWallNumber = status?.legacy_wall_cohort_number ?? null;
  const rosterCount = hiresData?.total ?? 0;
  const openSections = (gatesData?.gates ?? []).filter((g: { is_locked: boolean }) => !g.is_locked).length;
  const totalSections = gatesData?.gates?.length ?? 0;

  return (
    <div className="flex flex-col gap-5 max-w-4xl">
      {active ? (
        <ActiveCohortBanner
          name={active.name}
          startDate={active.start_date}
          endDate={active.end_date}
          camperCount={active.camper_count}
          campClosed={campClosed}
          legacyWallNumber={legacyWallNumber}
          onStartNew={() => setDialogOpen(true)}
          onGoToClose={() => onNavigate("close-camp")}
        />
      ) : (
        <Card className="p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">No active cohort</p>
            <p className="text-xs text-muted-foreground">Start one to open registration.</p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <Icon icon="plus" className="w-4 h-4 mr-1" /> Start new cohort
          </Button>
        </Card>
      )}

      <Card className="px-5 py-1">
        <CohortSetupStep
          number={1}
          title="Start the cohort"
          description="Name it and set its dates. Starting a cohort resets section locks and close-cAMP results."
          done={!!active && !campClosed}
        >
          {campClosed && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              This cohort is closed. Start the next one when you're ready.
            </p>
          )}
        </CohortSetupStep>

        <CohortSetupStep
          number={2}
          title={`Upload the new-hire list${active ? ` for ${active.name}` : ""}`}
          description="CSV with at least an email column. Name, role, region, start date, and manager are picked up when present."
          done={rosterCount > 0}
        >
          {active ? (
            <NewHireManager cohortId={active.id} camperId={0} />
          ) : (
            <p className="text-xs text-muted-foreground">Start a cohort first.</p>
          )}
        </CohortSetupStep>

        <CohortSetupStep
          number={3}
          title="Review the program"
          description="Agenda, activities, and settings carry over from the last cohort. Adjust anything that changed."
          done={false}
        >
          <div className="flex flex-wrap gap-2">
            {PROGRAM_SHORTCUTS.map((s) => (
              <Button key={s.view} variant="outline" size="sm" onClick={() => onNavigate(s.view)}>
                <Icon icon={s.icon} className="w-4 h-4 mr-1" />
                {s.label}
              </Button>
            ))}
          </div>
        </CohortSetupStep>

        <CohortSetupStep
          number={4}
          title="Unlock sections as camp goes"
          description={`${openSections} of ${totalSections} sections are open to cAMPers right now.`}
          done={false}
        >
          <Button variant="outline" size="sm" onClick={() => onNavigate("gates")}>
            <Icon icon="lock-open" className="w-4 h-4 mr-1" />
            Feature Gates
          </Button>
        </CohortSetupStep>
      </Card>

      <NewCohortDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        currentCohortName={active?.name ?? null}
        legacyWallPending={campClosed && !legacyWallNumber}
      />
    </div>
  );
}
