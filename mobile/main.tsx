import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient } from "@tanstack/react-query";
import { RouterProvider, createHashHistory, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import "../src/styles.css";

const router = createRouter({
  routeTree,
  context: { queryClient: new QueryClient() },
  // Hash routing keeps deep links working when the app is served from the Android WebView.
  history: createHashHistory(),
  defaultPreloadStaleTime: 0,
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
