import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Lets phones add the site to the home screen and open it like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.name,
    short_name: "Benches",
    description: site.description,
    start_url: "/",
    display: "standalone",
    background_color: "#edf0ea",
    theme_color: "#142326",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      // PNGs for Android home screens and install prompts, which don't all accept SVG.
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
