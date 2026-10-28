import Image from "next/image";
import Link from "next/link";
import { BenchMap } from "@/components/bench-map";
import { BenchRow, blur, formatDate } from "@/components/bench-parts";
import { JsonLd } from "@/components/json-ld";
import { Panorama } from "@/components/panorama";
import { getBenches, getTrashSpots, placeholderFor } from "@/lib/content/load";
import { toMapBenches, toMapTrash } from "@/lib/content/map-data";
import { photoSrc, type Bench } from "@/lib/content/parse";
import { homePicks } from "@/lib/content/picks";
import { site } from "@/lib/site";

export const ensureStatic = "navigation";

/** The hero panorama: water in view and no road nearby, else any bench with a panorama. */
function pickHero(benches: Bench[]) {
  const withPano = benches.filter((b) => b.panorama);
  return withPano.find((b) => b.features.waterView && !b.features.roadNearby) ?? withPano[0] ?? null;
}

/** How many of the newest benches the home page lists. */
const RECENT = 6;

const NUMBER_WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

export default function HomePage() {
  const benches = getBenches();
  const hero = pickHero(benches);
  const picks = homePicks(benches);
  const latest = benches[0]?.addedAt;
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

      <section className="frame pt-10 pb-8 sm:pt-16 sm:pb-10">
        <h1 className="display max-w-3xl text-[2.6rem] sm:text-6xl">Find a nice place to sit for a while.</h1>
        <p className="lede mt-5">
          {count} benches around FishHawk Ranch, each photographed from the seat, with honest notes on shade,
          trash cans, sunsets, and whether you&apos;ll be looking at a pond or a road.
        </p>
      </section>

      {hero?.panorama && (
        <figure>
          <Panorama
            src={photoSrc(hero.slug, hero.panorama)}
            alt={hero.panorama.alt}
            width={hero.panorama.width}
            height={hero.panorama.height}
            blurDataURL={placeholderFor(hero.slug, hero.panorama.file)}
            seatView={hero.panorama.seatView}
            label={`Panorama from ${hero.title}. Scroll sideways to look around.`}
            eager
          />
          <figcaption className="frame meta mt-2">
            From <Link href={`/benches/${hero.slug}`}>{hero.title}</Link>. Swipe or drag the photo to look around.
          </figcaption>
        </figure>
      )}

      <div className="frame">
        {picks.length > 0 && (
          <section aria-labelledby="picks-heading" className="mt-16">
            <h2 id="picks-heading" className="border-b border-rule pb-3 text-3xl">Start here</h2>
            <ul className="mt-6 grid gap-10 sm:grid-cols-3 sm:gap-6">
              {picks.map(({ label, reason, bench }) => {
                const photo = bench.view ?? bench.photos[0];
                return (
                  <li key={bench.slug}>
                    <Link href={`/benches/${bench.slug}`} className="group block text-ink no-underline">
                      <span className="photo-frame block aspect-[4/3] overflow-hidden rounded-lg">
                        <Image
                          src={photoSrc(bench.slug, photo)}
                          alt=""
                          width={photo.width}
                          height={photo.height}
                          sizes="(max-width: 640px) 100vw, 360px"
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          {...blur(bench.slug, photo.file)}
                        />
                      </span>
                      <span className="mt-3 block text-base text-moss">{label}</span>
                      <span className="block text-2xl leading-tight group-hover:text-pond group-hover:underline">
                        {bench.title}
                      </span>
                      <span className="meta mt-1 block">{reason}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section aria-labelledby="benches-heading" className="mt-16">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule pb-3">
            <h2 id="benches-heading" className="text-3xl">Recently added</h2>
            <Link href="/map" className="min-h-11 content-center">
              See them on the map
            </Link>
          </div>
          {latest ? (
            <>
              <p className="meta mt-3">Newest first. The latest went up on {formatDate(latest)}.</p>
              <div className="divide-y divide-rule">
                {benches.slice(0, RECENT).map((b) => (
                  <BenchRow key={b.slug} bench={b} />
                ))}
              </div>
            </>
          ) : (
            <p className="py-10 text-ink-soft">No benches yet. The first ones are on their way.</p>
          )}
          {benches.length > RECENT && (
            <p className="pt-2">
              <Link href="/benches">Browse all {benches.length} benches</Link>
            </p>
          )}
        </section>

        <section aria-labelledby="map-heading" className="mt-16">
          <h2 id="map-heading" className="text-3xl">Where they are</h2>
          <p className="meta mt-2 mb-5">Blue pins are benches, small grey ones are trash cans, and green paws are dog bag stations. Tap a pin for a peek.</p>
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
