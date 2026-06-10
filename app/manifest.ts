import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest. Drives the installable PWA on Android + iOS
// and is the source Bubblewrap reads when generating the Android (TWA) APK.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kintsugi Health OS",
    short_name: "Kintsugi",
    description:
      "A privacy-first Personal Health Operating System. Investigation, not diagnosis.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#1f6f54",
    categories: ["health", "medical", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
