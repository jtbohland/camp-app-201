import { createBrowserRouter } from "react-router";

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
        path: "/executives",
        lazy: () =>
          import("./pages/Executives/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/cohort",
        lazy: () =>
          import("./pages/Cohort/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
      {
        path: "/xplanation",
        lazy: () =>
          import("./pages/XPlanation/index.js").then((mod) => {
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
        path: "/admin",
        lazy: () =>
          import("./pages/Admin/index.js").then((mod) => {
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
        path: "/rubric",
        lazy: () =>
          import("./pages/Rubric/index.js").then((mod) => {
            const Component = mod.default;
            return { Component };
          }),
      },
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
