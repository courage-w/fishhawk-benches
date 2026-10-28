import { getBenches } from "@/lib/content/load";
import { photoSrc } from "@/lib/content/parse";
import { shareImage, shareSize } from "@/lib/share-image";
import { site } from "@/lib/site";

// The site-wide link preview (pages without their own): a bench with water in view, and the tagline.
export const size = shareSize;
export const contentType = "image/png";
export const alt = `${site.name}: ${site.tagline}`;

export default async function Image() {
  const benches = getBenches();
  const bench = benches.find((b) => b.features.waterView && !b.features.roadNearby) ?? benches[0];
  if (!bench) return new Response("Not found", { status: 404 });
  return shareImage({ photo: photoSrc(bench.slug, bench.view ?? bench.photos[0]), kicker: site.name, title: site.tagline });
}
