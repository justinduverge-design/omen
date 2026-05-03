/**
 * Vite config - SSFFMVP client
 *
 * Dev:   `npm run dev`        -> http://localhost:5173, /api/* proxies to :3000
 * Build: `npm run build`      -> client/dist/  (static files for prod)
 * Prod:  Express serves client/dist/ behind /api/* and SPA fallback
 *
 * VITE_API_BASE_URL: optional override. When same-origin (Express serves
 * the SPA on :3000 alongside the API), leave blank so the browser hits
 * the same host. For separated dev server, the proxy below handles it.
 *
 * VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: must be set at build time
 * for the auth client to work in prod.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },

  build: {
    outDir: "dist",
    sourcemap: false,
    emptyOutDir: true,
  },
});
