import type { Metadata } from "next";
import { BenchArchive, tagCounts } from "@/components/bench-archive";
import { getBenches, paginate } from "@/lib/content/load";
import { site } from "@/lib/site";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "All benches",
  description: "Every bench in the FishHawk Benches guide, newest first, with the view from each seat.",
  alternates: { canonical: "/benches" },
};

export default function BenchesPage() {
  const all = getBenches();
  const { items, page, totalPages } = paginate(all, 1, site.benchesPerPage);
  return (
    <BenchArchive
      title="All benches"
      intro={<p>Newest first. Pick a filter if you&apos;re after shade, water, or quiet.</p>}
      benches={items}
      page={page}
      totalPages={totalPages}
      hrefFor={(p) => (p === 1 ? "/benches" : `/benches/page/${p}`)}
      tagCounts={tagCounts(all)}
    />
  );
}
