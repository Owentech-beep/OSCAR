import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],

  base: "/oscar-brain/",

  build: {
    outDir: path.resolve(
      __dirname,
      "../public/oscar-brain",
    ),
    emptyOutDir: true,
  },

  server: {
    port: 5173,
    strictPort: true,
  },
});