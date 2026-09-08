import { createBrowserRouter, Navigate } from "react-router";

import { PageNotFound, RouteLoadError } from "@superblocksteam/library";

import RegisteredApp from "./App.js";

export const router = createBrowserRouter([
  {
    Component: RegisteredApp,
    errorElement: <RouteLoadError />,
    children: [
      {
        path: "/",
        index: true,
        lazy: () =>
          import("./pages/Home/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/profile",
        lazy: () =>
          import("./pages/Profile/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/journey",
        lazy: () =>
          import("./pages/Journey/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/agenda",
        lazy: () =>
          import("./pages/Agenda/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/teams",
        lazy: () =>
          import("./pages/Teams/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/teams/:teamId",
        lazy: () =>
          import("./pages/TeamHub/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/leaderboard",
        lazy: () =>
          import("./pages/Leaderboard/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/presentations",
        lazy: () =>
          import("./pages/Presentations/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/timer",
        lazy: () =>
          import("./pages/Timer/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/survey",
        lazy: () =>
          import("./pages/Survey/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/badges",
        lazy: () =>
          import("./pages/Badges/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/graduation",
        lazy: () =>
          import("./pages/Graduation/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/manager",
        lazy: () =>
          import("./pages/ManagerDashboard/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/admin",
        lazy: () =>
          import("./pages/Admin/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      // Redirects for old standalone routes
      { path: "/cohort", element: <Navigate to="/teams" replace /> },
      { path: "/team-history", element: <Navigate to="/teams" replace /> },
      { path: "/executives", element: <Navigate to="/agenda" replace /> },
      { path: "/announcements", element: <Navigate to="/" replace /> },
      { path: "/gallery", element: <Navigate to="/graduation" replace /> },
      { path: "/xplanation", element: <Navigate to="/badges" replace /> },
      { path: "/feedback", element: <Navigate to="/presentations" replace /> },
      { path: "/rubric", element: <Navigate to="/presentations" replace /> },
      {
        path: "*",
        Component: () => {
          const currentPath = window.location.pathname;
          return (
            <PageNotFound
              title="Page not found"
              errorMessage={
                currentPath === "/" ? (
                  <span>
                    The <strong>/</strong> route has been deleted from this
                    application. Please try another URL or contact your
                    developer for assistance.
                  </span>
                ) : (
                  "Content not found"
                )
              }
              hideActions={currentPath === "/"}
              buttonPath={"/"}
              buttonText={"Return to Base Camp"}
            />
          );
        },
      },
    ],
  },
]);
