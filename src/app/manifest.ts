import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Stock Condition Survey",
    short_name: "Stock Survey",
    description: "Mobile stock condition surveys with resilient offline drafts.",
    id: "/dashboard",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f2f5f5",
    theme_color: "#0e5a7b",
    icons: [
      { src: "/icons/stock-condition-192.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/stock-condition-512.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
    ]
  };
}
