import { Outlet } from "react-router";
import { useSuperblocksUser } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import AppSidebar from "@/components/AppSidebar";
import ProfileButton from "@/components/ProfileButton/index.js";
import QuickAwardPoints from "@/components/QuickAwardPoints";
import CloseCampModal from "@/components/CloseCampModal/index.js";
import LateCheckInModal from "@/components/LateCheckInModal/index.js";
import LateSurveyModal from "@/components/LateSurveyModal/index.js";
import RegistrationGuard from "@/components/RegistrationGuard/index.js";
import PastCohortBanner from "@/components/PastCohortBanner/index.js";
import CohortViewSwitcher from "@/components/CohortViewSwitcher/index.js";
import { useCohortView } from "@/hooks/useCohortView";

export default function AppShell() {
  const user = useSuperblocksUser();
  const { data: camperData } = useApiData("GetCurrentCamper", { email: user?.email ?? "" }, { enabled: !!user?.email });
  const camper = camperData?.camper;
  const { isAdmin } = useIsAdmin();
  // Viewing a past cohort is read-only: hide tools that award points or change camp state.
  const { isReadOnly } = useCohortView();

  return (
    <>
      <div className="flex h-full w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-full">
          <header className="flex items-center justify-end gap-3 px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm h-12 shrink-0">
            {isAdmin && (
              <div className="w-64">
                <CohortViewSwitcher />
              </div>
            )}
            <ProfileButton />
          </header>
          <PastCohortBanner />
          <main className="flex-1 overflow-auto">
            <RegistrationGuard>
              <Outlet />
            </RegistrationGuard>
          </main>
        </div>
      </div>
      {isAdmin && !isReadOnly && camper?.id && (
        <QuickAwardPoints camperId={camper.id} />
      )}
      {isAdmin && !isReadOnly && camper?.id && (
        <CloseCampModal camperId={camper.id} isAdmin={isAdmin} />
      )}
      {!isAdmin && camper?.id && camper.profile_completed && (
        <LateCheckInModal camperId={camper.id} isAdmin={false} />
      )}
      {!isAdmin && camper?.id && camper.profile_completed && (
        <LateSurveyModal camperId={camper.id} isAdmin={false} />
      )}
    </>
  );
}
