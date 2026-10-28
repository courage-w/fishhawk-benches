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
    background_color: "#f4f5ef",
    theme_color: "#142326",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
