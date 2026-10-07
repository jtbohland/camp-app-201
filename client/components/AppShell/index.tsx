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

export default function AppShell() {
  const user = useSuperblocksUser();
  const { data: camperData } = useApiData("GetCurrentCamper", { email: user?.email ?? "" }, { enabled: !!user?.email });
  const camper = camperData?.camper;
  const { isAdmin } = useIsAdmin();

  return (
    <>
      <div className="flex h-full w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-full">
          <header className="flex items-center justify-end px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm h-12 shrink-0">
            <ProfileButton />
          </header>
          <main className="flex-1 overflow-auto">
            <RegistrationGuard>
              <Outlet />
            </RegistrationGuard>
          </main>
        </div>
      </div>
      {isAdmin && camper?.id && (
        <QuickAwardPoints camperId={camper.id} />
      )}
      {isAdmin && camper?.id && (
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
