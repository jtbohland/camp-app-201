import { Outlet } from "react-router";

import { App as AppProvider } from "@superblocksteam/library";

import { Toaster } from "./components/common/sonner";
import AppShell from "./components/AppShell";
import { PointsBubbleProvider } from "./components/PointsBubble/index.js";
import { TimerProvider } from "./components/TimerContext/index.js";
import FloatingTimer from "./components/FloatingTimer/index.js";

export default function AppComponent() {
  return (
    <>
      {/* Do not remove the AppProvider */}
      <AppProvider className="h-full w-full">
        <TimerProvider>
          <PointsBubbleProvider>
            <AppShell />
            <FloatingTimer />
          </PointsBubbleProvider>
        </TimerProvider>
      </AppProvider>
      <Toaster />
    </>
  );
}
