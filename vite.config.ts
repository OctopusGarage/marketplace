import { defineConfig } from "vite";

export default defineConfig({
  root: "studio",
  base: "./",
  build: { outDir: "../site/studio", emptyOutDir: true },
});
