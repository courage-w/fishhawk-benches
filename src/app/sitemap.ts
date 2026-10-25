import type { MetadataRoute } from "next";
import { getBenches, getBenchesByTag } from "@/lib/content/load";
import { TAG_SLUGS } from "@/lib/content/traits";
import { absoluteUrl, site } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const benches = getBenches();
  const newest = benches.map((b) => b.updatedAt ?? b.addedAt).sort().at(-1);
  const pages = Math.ceil(benches.length / site.benchesPerPage);

  const fixed = ["/", "/benches", "/map", "/about", "/contact", "/privacy", "/terms"].map((path) => ({
    url: absoluteUrl(path),
    lastModified: ["/", "/benches", "/map"].includes(path) ? newest : undefined,
  }));

  return [
    ...fixed,
    ...Array.from({ length: Math.max(0, pages - 1) }, (_, i) => ({ url: absoluteUrl(`/benches/page/${i + 2}`) })),
    // Only tag pages with something on them; empty ones are noindex.
    ...TAG_SLUGS.filter((t) => getBenchesByTag(t).length > 0).map((t) => ({ url: absoluteUrl(`/benches/tag/${t}`) })),
    ...benches.map((b) => ({
      url: absoluteUrl(`/benches/${b.slug}`),
      lastModified: b.updatedAt ?? b.addedAt,
    })),
  ];
}
