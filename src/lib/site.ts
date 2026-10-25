// Site-wide settings. Only non-secret values belong here; this file can reach client bundles.

function siteUrl(): string {
  // Explicit setting first; then Vercel's own production domain (a system variable present on
  // every Vercel build, previews included, so canonical URLs always point at production).
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const raw = process.env.NEXT_PUBLIC_SITE_URL || (vercel ? `https://${vercel}` : "http://localhost:3000");
  // Canonical URLs, the sitemap and RSS all hang off this, so fail loudly on a bad value.
  const url = new URL(raw);
  if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") {
    throw new Error(`NEXT_PUBLIC_SITE_URL must use https (got ${raw})`);
  }
  return url.origin;
}

export const site = {
  name: "FishHawk Benches",
  tagline: "Places to sit down in FishHawk Ranch",
  description:
    "A field guide to the benches of FishHawk Ranch in Lithia, Florida: the view from each seat, a full panorama, and honest pros and cons.",
  url: siteUrl(),
  /** Shown as the author of bench entries and in structured data. */
  author: "FishHawk Benches",
  locale: "en_US",
  /** First year of publication, for the copyright line (a render-time clock would make pages dynamic). */
  since: 2026,
  /** Map starting view: roughly the centre of the photographed benches. */
  mapCenter: { lat: 27.8517, lng: -82.2123 },
  benchesPerPage: 12,
} as const;

export const absoluteUrl = (path: string) => new URL(path, site.url).toString();
