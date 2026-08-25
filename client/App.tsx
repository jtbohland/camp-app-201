import { Outlet } from "react-router";

import { App as AppProvider } from "@superblocksteam/library";

import { Toaster } from "./components/common/sonner";
import AppSidebar from "./components/AppSidebar";

export default function AppComponent() {
  return (
    <>
      {/* Do not remove the AppProvider */}
      <AppProvider className="h-full w-full">
        <div className="flex h-full w-full">
          <AppSidebar />
          <main className="flex-1 h-full overflow-auto">
            <Outlet />
          </main>
        </div>
      </AppProvider>
      <Toaster />
    </>
  );
}
