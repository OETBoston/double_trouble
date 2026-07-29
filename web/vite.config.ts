import { existsSync, readFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const currentDir = dirname(fileURLToPath(import.meta.url));

// Geolocation requires a secure context on phones, so LAN testing needs
// HTTPS. Falls back to plain HTTP if the mkcert-generated cert (see
// README) isn't present, so a fresh clone still runs without extra setup.
const certPath = resolve(currentDir, "../certs/lan-cert.pem");
const keyPath = resolve(currentDir, "../certs/lan-key.pem");
// E2E tests force plain HTTP (via VITE_DISABLE_HTTPS) so they don't depend
// on this machine's local mkcert setup, which won't exist on a fresh clone.
const httpsConfig =
  !process.env.VITE_DISABLE_HTTPS && existsSync(certPath) && existsSync(keyPath)
    ? { cert: readFileSync(certPath), key: readFileSync(keyPath) }
    : undefined;

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      manifest: {
        name: "Boston Double Parking Reporter",
        short_name: "BOS Parking",
        description: "Quickly report an illegally double-parked car to the City of Boston.",
        theme_color: "#0C2340",
        background_color: "#0C2340",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // mapbox-gl/recharts chunks exceed Workbox's 2 MiB default.
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // Never serve stale report/stat data from the cache; only precache
        // the static app shell.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/api\//,
            handler: "NetworkOnly",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Binds to all network interfaces (not just localhost) so phones on
    // the same Wi-Fi network can reach the dev server directly.
    host: true,
    https: httpsConfig,
  },
});
