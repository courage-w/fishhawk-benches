import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BenchArchive, tagCounts } from "@/components/bench-archive";
import { getBenches, getBenchesByTag } from "@/lib/content/load";
import { TAGS, TAG_SLUGS, type TagSlug } from "@/lib/content/traits";

export const ensureStatic = "navigation";

const isTag = (value: string): value is TagSlug => (TAG_SLUGS as string[]).includes(value);

export function generateStaticParams() {
  return TAG_SLUGS.map((tag) => ({ tag }));
}

export async function generateMetadata({ params }: PageProps<"/benches/tag/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  // Next.js adds noindex to not-found responses itself.
  if (!isTag(tag)) return { title: "Not found" };
  const empty = getBenchesByTag(tag).length === 0;
  return {
    title: `${TAGS[tag].label} benches`,
    description: `${TAGS[tag].description} Photos and honest notes from FishHawk Ranch.`,
    alternates: { canonical: `/benches/tag/${tag}` },
    // An empty filter page has nothing worth indexing.
    robots: empty ? { index: false, follow: true } : undefined,
  };
}

export default async function TagPage({ params }: PageProps<"/benches/tag/[tag]">) {
  const { tag } = await params;
  if (!isTag(tag)) notFound();
  const benches = getBenchesByTag(tag);
  return (
    <BenchArchive
      title={`${TAGS[tag].label} benches`}
      intro={<p>{TAGS[tag].description}</p>}
      benches={benches}
      page={1}
      totalPages={1}
      hrefFor={() => `/benches/tag/${tag}`}
      activeTag={tag}
      tagCounts={tagCounts(getBenches())}
    />
  );
}
