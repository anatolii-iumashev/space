// app.config.ts
import { defineConfig } from "@tanstack/start/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
var app_config_default = defineConfig({
  vite: {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3001,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true
        }
      }
    }
  }
});
export {
  app_config_default as default
};
