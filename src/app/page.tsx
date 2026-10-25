import Link from "next/link";
import { BenchMap } from "@/components/bench-map";
import { BenchRow } from "@/components/bench-parts";
import { JsonLd } from "@/components/json-ld";
import { Panorama } from "@/components/panorama";
import { getBenches, getTrashSpots } from "@/lib/content/load";
import { toMapBenches, toMapTrash } from "@/lib/content/map-data";
import { photoSrc } from "@/lib/content/parse";
import { site } from "@/lib/site";

export const ensureStatic = "navigation";

/** The hero panorama: the bench with water in view and the widest sweep. */
function pickHero(benches: ReturnType<typeof getBenches>) {
  const withPano = benches.filter((b) => b.panorama);
  return (
    withPano.find((b) => b.features.waterView && !b.features.roadNearby) ?? withPano[0] ?? null
  );
}

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

export default function HomePage() {
  const benches = getBenches();
  const hero = pickHero(benches);
  const count = NUMBER_WORDS[benches.length] ?? String(benches.length);

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: site.name,
          url: site.url,
          description: site.description,
        }}
      />

      {hero?.panorama && (
        <figure>
          <Panorama
            src={photoSrc(hero.slug, hero.panorama)}
            alt={hero.panorama.alt}
            width={hero.panorama.width}
            height={hero.panorama.height}
            seatView={hero.panorama.seatView}
            label={`Panorama from ${hero.title}. Scroll sideways to look around.`}
            eager
          />
          <figcaption className="frame meta mt-3">
            From <Link href={`/benches/${hero.slug}`}>{hero.title}</Link>. Swipe or drag sideways to look around.
            {hero.panorama.seatView && " The two lines frame the view from the seat."}
          </figcaption>
        </figure>
      )}

      <div className="frame">
        <section className="pt-12 pb-6 sm:pt-16">
          <h1 className="display max-w-3xl text-[2.6rem] sm:text-6xl">Find a nice place to sit for a while.</h1>
          <p className="lede mt-6">
            {count} benches around FishHawk Ranch so far, each photographed from the seat: the view, the bench
            itself, and a full panorama. Plus honest notes on shade, trash cans, and whether you&apos;ll be
            looking at a pond or a road.
          </p>
        </section>

        <section aria-labelledby="benches-heading" className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule pb-3">
            <h2 id="benches-heading" className="text-3xl">The benches</h2>
            <Link href="/map" className="min-h-11 content-center">
              See them all on the map
            </Link>
          </div>
          {benches.length > 0 ? (
            <div className="divide-y divide-rule">
              {benches.slice(0, site.benchesPerPage).map((b, i) => (
                <BenchRow key={b.slug} bench={b} eager={i < 2} />
              ))}
            </div>
          ) : (
            <p className="py-10 text-ink-soft">No benches yet. The first ones are on their way.</p>
          )}
          {benches.length > site.benchesPerPage && (
            <p className="pt-2">
              <Link href="/benches">Browse every bench</Link>
            </p>
          )}
        </section>

        <section aria-labelledby="map-heading" className="mt-16">
          <h2 id="map-heading" className="text-3xl">Where they are</h2>
          <p className="meta mt-2 mb-5">Blue pins are benches, small grey ones are trash cans. Tap a pin for a peek.</p>
          <BenchMap
            benches={toMapBenches(benches)}
            trash={toMapTrash(getTrashSpots())}
            className="h-[26rem]"
            label="Map of all benches and trash cans"
          />
        </section>
      </div>
    </>
  );
}
