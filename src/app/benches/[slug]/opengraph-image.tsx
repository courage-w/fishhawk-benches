import { getBench, getBenches } from "@/lib/content/load";
import { photoSrc } from "@/lib/content/parse";
import { shareImage, shareSize } from "@/lib/share-image";
import { site } from "@/lib/site";

// A bench's link preview: its view photo with the bench name on it.
export const size = shareSize;
export const contentType = "image/png";
export const alt = "The view from the bench, with its name";

export function generateStaticParams() {
  return getBenches().map((b) => ({ slug: b.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const bench = getBench((await params).slug);
  if (!bench) return new Response("Not found", { status: 404 });
  return shareImage({ photo: photoSrc(bench.slug, bench.view ?? bench.photos[0]), kicker: site.name, title: bench.title });
}
