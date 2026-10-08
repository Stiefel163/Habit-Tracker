import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

// `vite build` → normal static site (deploy to Vercel/Netlify/GitHub Pages)
// `vite build --mode single` → one self-contained HTML file in dist-single/
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "single" ? [react(), viteSingleFile()] : [react()],
  build: { outDir: mode === "single" ? "dist-single" : "dist" },
  test: { environment: "node" },
}));
