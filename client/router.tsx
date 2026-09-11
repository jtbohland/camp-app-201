import { createBrowserRouter, Navigate } from "react-router";

import RegisteredApp from "./App.js";
import FeatureGate from "./components/FeatureGate/index.js";

/** Wraps a page component in a FeatureGate */
function gated(Page: React.ComponentType, gateKey: string) {
  const GatedPage = () => (
    <FeatureGate featureKey={gateKey}>
      <Page />
    </FeatureGate>
  );
  return GatedPage;
}

export const router = createBrowserRouter([
  {
    Component: RegisteredApp,
    children: [
      // No gate — always accessible
      { path: "/", index: true, lazy: () => import("./pages/Home/index.js").then((m) => ({ Component: m.default })) },
      { path: "/profile", lazy: () => import("./pages/Profile/index.js").then((m) => ({ Component: m.default })) },
      { path: "/manager", lazy: () => import("./pages/ManagerDashboard/index.js").then((m) => ({ Component: m.default })) },
      { path: "/admin", lazy: () => import("./pages/Admin/index.js").then((m) => ({ Component: m.default })) },

      // Gated pages
      { path: "/journey", lazy: () => import("./pages/Journey/index.js").then((m) => ({ Component: gated(m.default, "journey") })) },
      { path: "/agenda", lazy: () => import("./pages/Agenda/index.js").then((m) => ({ Component: gated(m.default, "agenda") })) },
      { path: "/teams", lazy: () => import("./pages/Teams/index.js").then((m) => ({ Component: m.default })) },
      { path: "/teams/:teamId", lazy: () => import("./pages/TeamHub/index.js").then((m) => ({ Component: gated(m.default, "teams") })) },
      { path: "/presentations", lazy: () => import("./pages/Presentations/index.js").then((m) => ({ Component: gated(m.default, "presentations") })) },
      { path: "/timer", lazy: () => import("./pages/Timer/index.js").then((m) => ({ Component: gated(m.default, "timer") })) },
      { path: "/wheel-and-deal", lazy: () => import("./pages/WheelAndDeal/index.js").then((m) => ({ Component: gated(m.default, "wheel_and_deal") })) },
      { path: "/survey", lazy: () => import("./pages/Survey/index.js").then((m) => ({ Component: gated(m.default, "surveys") })) },
      { path: "/badges", lazy: () => import("./pages/Badges/index.js").then((m) => ({ Component: gated(m.default, "badges") })) },
      { path: "/graduation", lazy: () => import("./pages/Graduation/index.js").then((m) => ({ Component: gated(m.default, "graduation") })) },

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
