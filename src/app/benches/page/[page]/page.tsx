import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { BenchArchive, tagCounts } from "@/components/bench-archive";
import { getBenches, paginate } from "@/lib/content/load";
import { site } from "@/lib/site";

export const ensureStatic = "navigation";

function totalPages() {
  return Math.max(1, Math.ceil(getBenches().length / site.benchesPerPage));
}

/** Only real, in-range page numbers like "2"; rejects "02", "1.5", "abc". */
function parsePage(raw: string): number | null {
  if (!/^[1-9]\d{0,3}$/.test(raw)) return null;
  const n = Number(raw);
  return n <= totalPages() ? n : null;
}

export function generateStaticParams() {
  // Page 1 lives at /benches. Build needs at least one entry, so include it; it redirects.
  return Array.from({ length: totalPages() }, (_, i) => ({ page: String(i + 1) }));
}

export async function generateMetadata({ params }: PageProps<"/benches/page/[page]">): Promise<Metadata> {
  const page = parsePage((await params).page);
  // Next.js adds noindex to not-found responses itself.
  if (!page) return { title: "Page not found" };
  return {
    title: `All benches, page ${page}`,
    description: `Page ${page} of the FishHawk Benches guide.`,
    alternates: { canonical: `/benches/page/${page}` },
  };
}

export default async function BenchesPagedPage({ params }: PageProps<"/benches/page/[page]">) {
  const page = parsePage((await params).page);
  if (!page) notFound();
  if (page === 1) permanentRedirect("/benches");

  const all = getBenches();
  const result = paginate(all, page, site.benchesPerPage);
  return (
    <BenchArchive
      title="All benches"
      intro={<p>Page {page}, older benches.</p>}
      benches={result.items}
      page={result.page}
      totalPages={result.totalPages}
      hrefFor={(p) => (p === 1 ? "/benches" : `/benches/page/${p}`)}
      tagCounts={tagCounts(all)}
    />
  );
}
