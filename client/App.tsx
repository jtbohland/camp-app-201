import { Outlet } from "react-router";

import { App as AppProvider } from "@superblocksteam/library";

import { Toaster } from "./components/common/sonner";
import AppSidebar from "./components/AppSidebar";
import ProfileButton from "./components/ProfileButton/index.js";
import AppShell from "./components/AppShell";

export default function AppComponent() {
  return (
    <>
      {/* Do not remove the AppProvider */}
      <AppProvider className="h-full w-full">
        <AppShell />
      </AppProvider>
      <Toaster />
    </>
  );
}
