import type { Metadata } from "next";
import Link from "next/link";
import { BenchMap } from "@/components/bench-map";
import { featureLine } from "@/components/bench-parts";
import { getBenches, getTrashSpots } from "@/lib/content/load";
import { toMapBenches, toMapTrash } from "@/lib/content/map-data";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "Map of benches and trash cans",
  description: "Every bench and trash can in the FishHawk Benches guide on one map of FishHawk Ranch.",
  alternates: { canonical: "/map" },
};

export default function MapPage() {
  const benches = getBenches();
  const trash = getTrashSpots();
  return (
    <div className="frame pt-12 sm:pt-16">
      <h1 className="display text-5xl sm:text-6xl">The map</h1>
      <p className="lede mt-5">
        Every bench, plus the trash cans spotted along the way. Zoom in to see them all, and tap a bench for a
        peek at its view.
      </p>

      <div className="mt-8">
        <BenchMap
          benches={toMapBenches(benches)}
          trash={toMapTrash(trash)}
          showToggles
          className="h-[70vh] min-h-[24rem]"
          label="Map of benches and trash cans in FishHawk Ranch"
        />
      </div>

      <section aria-labelledby="list-heading" className="mt-14">
        <h2 id="list-heading" className="text-3xl">Benches on this map</h2>
        <ul className="mt-4 divide-y divide-rule border-y border-rule">
          {benches.map((b) => (
            <li key={b.slug} className="flex flex-wrap items-baseline justify-between gap-x-6 py-3">
              <Link href={`/benches/${b.slug}`} className="min-h-11 content-center text-xl">
                {b.title}
              </Link>
              <span className="meta">{featureLine(b)}</span>
            </li>
          ))}
        </ul>
        <p className="meta mt-4">
          {trash.length === 1 ? "One trash can is" : `${trash.length} trash cans are`} marked on the map on their own.
          Benches with a trash can right beside them say so on their page.
        </p>
      </section>
    </div>
  );
}
