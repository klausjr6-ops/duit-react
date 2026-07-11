import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  build: {
    target: "esnext",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("/react/") || id.includes("/react-dom/")) {
            return "react-vendor";
          }

          if (id.includes("/framer-motion/") || id.includes("/motion-dom/") || id.includes("/motion-utils/")) {
            return "motion";
          }

          if (id.includes("/@firebase/firestore") || id.includes("/firebase/firestore")) {
            return "firebase-firestore";
          }

          if (id.includes("/@firebase/auth") || id.includes("/firebase/auth")) {
            return "firebase-auth";
          }

          if (
            id.includes("/@firebase/app") ||
            id.includes("/firebase/app") ||
            id.includes("/@firebase/component") ||
            id.includes("/@firebase/logger") ||
            id.includes("/@firebase/util")
          ) {
            return "firebase-core";
          }

          return undefined;
        },
      },
    },
  },
});
