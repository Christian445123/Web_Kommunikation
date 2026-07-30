import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  // Read the monorepo root .env (one shared file for backend + frontend config) instead of
  // requiring a separate packages/frontend/.env.
  envDir: fileURLToPath(new URL("../..", import.meta.url)),
  server: {
    port: 5173,
  },
});
