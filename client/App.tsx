import { Outlet } from "react-router";

import { App as AppProvider } from "@superblocksteam/library";

import { Toaster } from "./components/common/sonner";
import AppSidebar from "./components/AppSidebar";
import ProfileButton from "./components/ProfileButton/index.js";

export default function AppComponent() {
  return (
    <>
      {/* Do not remove the AppProvider */}
      <AppProvider className="h-full w-full">
        <div className="flex h-full w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col h-full">
            {/* Top bar with profile button */}
            <header className="flex items-center justify-end px-4 py-2 border-b border-border bg-background/80 backdrop-blur-sm h-12 shrink-0">
              <ProfileButton />
            </header>
            <main className="flex-1 overflow-auto">
              <Outlet />
            </main>
          </div>
        </div>
      </AppProvider>
      <Toaster />
    </>
  );
}
