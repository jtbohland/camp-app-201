import { Outlet } from "react-router";
import { useSuperblocksUser } from "@superblocksteam/library";
import { useApiData } from "@/hooks/useApiData";
import AppSidebar from "@/components/AppSidebar";
import ProfileButton from "@/components/ProfileButton/index.js";
import QuickAwardPoints from "@/components/QuickAwardPoints";

export default function AppShell() {
  const user = useSuperblocksUser();
  const { data: camperData } = useApiData("GetCurrentCamper", { email: user?.email ?? "" }, { enabled: !!user?.email });
  const camper = camperData?.camper as any;
  const isAdmin = camper?.role === "counselor" || camper?.role === "admin";

  return (
    <>
      <div className="flex h-full w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col h-full">
          <header className="flex items-center justify-end px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm h-12 shrink-0">
            <ProfileButton />
          </header>
          <main className="flex-1 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
      {isAdmin && camper?.id && (
        <QuickAwardPoints camperId={camper.id} />
      )}
    </>
  );
}
