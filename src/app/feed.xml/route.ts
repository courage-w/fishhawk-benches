import { getBenches } from "@/lib/content/load";
import { buildFeed } from "@/lib/feed";
import { site } from "@/lib/site";

// Reads only build-time content, so it's prerendered as a static file.
export function GET() {
  const xml = buildFeed({
    siteUrl: site.url,
    title: site.name,
    description: site.description,
    benches: getBenches().slice(0, 50),
  });
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
