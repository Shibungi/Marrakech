import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [".trycloudflare.com"],
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
  preview: {
    allowedHosts: [".trycloudflare.com"],
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
  },
});
