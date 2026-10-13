import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "SetBook — Song Charts & Setlists",
    short_name: "SetBook",
    description: "A local-first song chart and setlist workspace for musicians.",
    start_url: "/library",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#fafafa",
    theme_color: "#111111",
    categories: ["music", "productivity"],
    icons: [
      {
        src: "/icons/setbook-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/setbook-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/setbook-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Song library",
        short_name: "Library",
        url: "/library",
        icons: [{ src: "/icons/setbook-192.png", sizes: "192x192" }],
      },
      {
        name: "Setlists",
        short_name: "Setlists",
        url: "/setlists",
        icons: [{ src: "/icons/setbook-192.png", sizes: "192x192" }],
      },
      {
        name: "Add song",
        short_name: "Add song",
        url: "/songs/new",
        icons: [{ src: "/icons/setbook-192.png", sizes: "192x192" }],
      },
    ],
  };
}
