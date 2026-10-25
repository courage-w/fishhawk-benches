// RSS 2.0 for new benches. Every interpolated value goes through escapeXml.
import type { Bench } from "./content/parse";
import { photoSrc } from "./content/parse";

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    // Characters that are illegal in XML 1.0.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
}

const rfc822 = (isoDate: string) => new Date(`${isoDate.slice(0, 10)}T12:00:00Z`).toUTCString();

export function buildFeed(opts: { siteUrl: string; title: string; description: string; benches: Bench[] }): string {
  const abs = (path: string) => new URL(path, opts.siteUrl).toString();
  const items = opts.benches.map((b) => {
    const link = abs(`/benches/${b.slug}`);
    const photo = b.view ?? b.photos[0];
    return `    <item>
      <title>${escapeXml(b.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${rfc822(b.addedAt)}</pubDate>
      <description>${escapeXml(b.summary)}</description>
      <enclosure url="${escapeXml(abs(photoSrc(b.slug, photo)))}" type="image/jpeg" length="0" />
    </item>`;
  });
  const latest = opts.benches[0]?.updatedAt ?? opts.benches[0]?.addedAt;
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(opts.title)}</title>
    <link>${escapeXml(abs("/"))}</link>
    <description>${escapeXml(opts.description)}</description>
    <language>en-us</language>
    <atom:link href="${escapeXml(abs("/feed.xml"))}" rel="self" type="application/rss+xml" />
${latest ? `    <lastBuildDate>${rfc822(latest)}</lastBuildDate>\n` : ""}${items.join("\n")}
  </channel>
</rss>
`;
}
