// vite.config.ts
import { defineConfig } from "vinxi";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/start/vite";
var vite_config_default = defineConfig({
  appType: "spa",
  plugins: [
    tanstackStart(),
    react(),
    tailwindcss()
  ],
  server: {
    port: 3001,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  }
});
export {
  vite_config_default as default
};
