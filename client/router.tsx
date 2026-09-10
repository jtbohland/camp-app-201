import { createBrowserRouter, Navigate } from "react-router";

import RegisteredApp from "./App.js";
import FeatureGate from "./components/FeatureGate/index.js";

/** Helper: lazy load a page, optionally wrapped in a FeatureGate */
function gatedLazy(importFn: () => Promise<{ default: React.ComponentType }>, gateKey?: string) {
  return {
    lazy: () =>
      importFn().then((mod) => {
        const Page = mod.default;
        if (!gateKey) return { Component: Page };
        const GatedPage = () => (
          <FeatureGate featureKey={gateKey}>
            <Page />
          </FeatureGate>
        );
        return { Component: GatedPage };
      }),
  };
}

export const router = createBrowserRouter([
  {
    Component: RegisteredApp,
    children: [
      // No gate — always accessible
      { path: "/", index: true, ...gatedLazy(() => import("./pages/Home/index.js")) },
      { path: "/profile", ...gatedLazy(() => import("./pages/Profile/index.js")) },
      { path: "/manager", ...gatedLazy(() => import("./pages/ManagerDashboard/index.js")) },
      { path: "/admin", ...gatedLazy(() => import("./pages/Admin/index.js")) },

      // Gated pages
      { path: "/journey", ...gatedLazy(() => import("./pages/Journey/index.js"), "journey") },
      { path: "/agenda", ...gatedLazy(() => import("./pages/Agenda/index.js"), "agenda") },
      { path: "/teams", ...gatedLazy(() => import("./pages/Teams/index.js")) },
      { path: "/teams/:teamId", ...gatedLazy(() => import("./pages/TeamHub/index.js"), "teams") },
      { path: "/presentations", ...gatedLazy(() => import("./pages/Presentations/index.js"), "presentations") },
      { path: "/timer", ...gatedLazy(() => import("./pages/Timer/index.js"), "timer") },
      { path: "/survey", ...gatedLazy(() => import("./pages/Survey/index.js"), "surveys") },
      { path: "/badges", ...gatedLazy(() => import("./pages/Badges/index.js"), "badges") },
      { path: "/graduation", ...gatedLazy(() => import("./pages/Graduation/index.js"), "graduation") },

      // Redirects for old standalone routes
      { path: "/cohort", element: <Navigate to="/teams" replace /> },
      { path: "/team-history", element: <Navigate to="/teams" replace /> },
      { path: "/executives", element: <Navigate to="/agenda" replace /> },
      { path: "/announcements", element: <Navigate to="/" replace /> },
      { path: "/gallery", element: <Navigate to="/graduation" replace /> },
      { path: "/xplanation", element: <Navigate to="/badges" replace /> },
      { path: "/feedback", element: <Navigate to="/presentations" replace /> },
      { path: "/rubric", element: <Navigate to="/presentations" replace /> },

      // Catch-all: redirect unknown routes to home
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
