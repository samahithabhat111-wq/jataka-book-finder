import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import { resolve } from "node:path";

const here = import.meta.dirname;

// Client-only build of the app, bundled into the Android APK by Capacitor (output: dist-android).
export default defineConfig({
  root: resolve(here, "mobile"),
  envDir: here,
  publicDir: resolve(here, "public"),
  base: "./",
  plugins: [
    tanstackRouter({
      target: "react",
      routesDirectory: resolve(here, "src/routes"),
      generatedRouteTree: resolve(here, "mobile/routeTree.gen.ts"),
    }),
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { "@": resolve(here, "src") } },
  build: { outDir: resolve(here, "dist-android"), emptyOutDir: true },
});
