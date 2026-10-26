import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BenchMap } from "@/components/bench-map";
import { blur, cap, FactList, formatDate, ProsCons, TagLinks } from "@/components/bench-parts";
import { CompassArrow } from "@/components/icons";
import { JsonLd } from "@/components/json-ld";
import { headingsOf, Markdown } from "@/components/markdown";
import { Panorama } from "@/components/panorama";
import { ShareControls } from "@/components/share-controls";
import { getBench, getBenches, getTrashSpots, nearestBenches, placeholderFor } from "@/lib/content/load";
import { toMapBenches, toMapTrash } from "@/lib/content/map-data";
import { photoSrc } from "@/lib/content/parse";
import { formatWalkingDistance } from "@/lib/geo";
import { absoluteUrl, site } from "@/lib/site";

export const ensureStatic = "navigation";

export function generateStaticParams() {
  return getBenches().map((b) => ({ slug: b.slug }));
}

export async function generateMetadata({ params }: PageProps<"/benches/[slug]">): Promise<Metadata> {
  const bench = getBench((await params).slug);
  // Next.js adds noindex to not-found responses itself.
  if (!bench) return { title: "Bench not found" };
  const image = bench.view ?? bench.photos[0];
  const title = bench.seo?.title ?? bench.title;
  const description = bench.seo?.description ?? bench.summary;
  const path = `/benches/${bench.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title,
      description,
      url: path,
      publishedTime: bench.addedAt,
      modifiedTime: bench.updatedAt ?? bench.addedAt,
      images: [{ url: photoSrc(bench.slug, image), width: image.width, height: image.height, alt: image.alt }],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BenchPage({ params }: PageProps<"/benches/[slug]">) {
  const bench = getBench((await params).slug);
  if (!bench) notFound();

  const url = absoluteUrl(`/benches/${bench.slug}`);
  const nearby = nearestBenches(bench);
  const toc = headingsOf(bench.body);
  const { lat, lng } = bench.location;
  const coords = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  const author = bench.author ?? site.author;

  return (
    <article>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: bench.title,
          description: bench.summary,
          image: bench.photos.filter((p) => p.role !== "panorama").map((p) => absoluteUrl(photoSrc(bench.slug, p))),
          datePublished: bench.addedAt,
          dateModified: bench.updatedAt ?? bench.addedAt,
          author: { "@type": "Organization", name: author, url: site.url },
          publisher: { "@type": "Organization", name: site.name, url: site.url },
          mainEntityOfPage: url,
          contentLocation: {
            "@type": "Place",
            name: bench.title,
            geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
          },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Benches", item: absoluteUrl("/benches") },
            { "@type": "ListItem", position: 2, name: bench.title, item: url },
          ],
        }}
      />

      <header className="frame pt-10 pb-8 sm:pt-14">
        <nav aria-label="Breadcrumb" className="meta">
          <Link href="/benches">Benches</Link>
          <span aria-hidden="true"> / </span>
          <span aria-current="page">{bench.title}</span>
        </nav>
        {bench.status === "draft" && (
          <p className="mt-4 inline-block rounded-md bg-reed px-3 py-1">Draft preview. Not visible on the live site.</p>
        )}
        <h1 className="display mt-4 text-[2.5rem] sm:text-6xl">{bench.title}</h1>
        <p className="lede mt-5">{bench.summary}</p>
        <p className="meta mt-4">
          Added {formatDate(bench.addedAt)}
          {bench.updatedAt && <>. Updated {formatDate(bench.updatedAt)}</>}.
        </p>
      </header>

      {bench.panorama && (
        <figure>
          <Panorama
            src={photoSrc(bench.slug, bench.panorama)}
            alt={bench.panorama.alt}
            width={bench.panorama.width}
            height={bench.panorama.height}
            blurDataURL={placeholderFor(bench.slug, bench.panorama.file)}
            seatView={bench.panorama.seatView}
            label="Panorama from the bench. Scroll sideways to look around."
            eager
          />
          <figcaption className="frame meta mt-3">
            {bench.panorama.caption ?? "The whole scene from the bench. Swipe or drag the photo to look around."}
            {bench.panorama.seatView && " The two lines frame what you see sitting down."}
          </figcaption>
        </figure>
      )}

      <div className="frame mt-14 grid gap-14 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="min-w-0">
          {bench.view && (
            <figure>
              <h2 className="mb-4 text-2xl">The view from the seat</h2>
              <div className="photo-frame overflow-hidden rounded-lg">
                <Image
                  src={photoSrc(bench.slug, bench.view)}
                  alt={bench.view.alt}
                  width={bench.view.width}
                  height={bench.view.height}
                  sizes="(max-width: 1024px) 100vw, 720px"
                  loading={bench.panorama ? "lazy" : "eager"}
                  className="h-auto w-full"
                  {...blur(bench.slug, bench.view.file)}
                />
              </div>
              <figcaption className="meta mt-3 flex items-center gap-2">
                {bench.facingDegrees !== null && <CompassArrow degrees={bench.facingDegrees} className="h-5 w-5 text-pond" />}
                {bench.view.caption ??
                  (bench.facingPoint ? `Sitting here, you're looking ${bench.facingPoint}.` : "What you see sitting down.")}
                {bench.view.credit && <> Photo: {bench.view.credit}.</>}
              </figcaption>
            </figure>
          )}

          <div className="mt-12">
            <ProsCons bench={bench} />
          </div>

          {bench.body && (
            <section aria-labelledby="notes-heading" className="mt-12">
              <h2 id="notes-heading" className="text-2xl">Notes from the bench</h2>
              {toc.length >= 3 && (
                <nav aria-label="On this page" className="mt-4 rounded-lg border border-rule p-4">
                  <ol className="list-decimal space-y-1 pl-5">
                    {toc.map((h) => (
                      <li key={h.id}>
                        <a href={`#${h.id}`}>{h.text}</a>
                      </li>
                    ))}
                  </ol>
                </nav>
              )}
              <div className="mt-4">
                <Markdown source={bench.body} />
              </div>
            </section>
          )}

          {bench.others.length > 0 && (
            <section aria-labelledby="around-heading" className="mt-12">
              <h2 id="around-heading" className="text-2xl">The bench and around it</h2>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {bench.others.map((p) => (
                  <li key={p.file}>
                    <figure>
                      <a href={photoSrc(bench.slug, p)} className="photo-frame block aspect-[4/3] overflow-hidden rounded-lg">
                        <Image
                          src={photoSrc(bench.slug, p)}
                          alt={p.alt}
                          width={p.width}
                          height={p.height}
                          sizes="(max-width: 640px) 100vw, 360px"
                          className="h-full w-full object-cover"
                          {...blur(bench.slug, p.file)}
                        />
                        <span className="sr-only"> (open full-size photo)</span>
                      </a>
                      {(p.caption || p.credit) && (
                        <figcaption className="meta mt-2">
                          {p.caption}
                          {p.credit && <> Photo: {p.credit}.</>}
                        </figcaption>
                      )}
                    </figure>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-10 lg:pt-12" aria-label="About this bench">
          <section aria-labelledby="facts-heading">
            <h2 id="facts-heading" className="text-xl">At a glance</h2>
            <div className="mt-3">
              <FactList bench={bench} />
            </div>
          </section>

          <section aria-labelledby="where-heading">
            <h2 id="where-heading" className="text-xl">Where it is</h2>
            <div className="mt-3">
              <BenchMap
                benches={toMapBenches(getBenches())}
                trash={toMapTrash(getTrashSpots())}
                activeSlug={bench.slug}
                className="h-64"
                label={`Map showing ${bench.title}`}
              />
            </div>
            <p className="meta mt-3">{coords}</p>
            <ul className="mt-2 space-y-1">
              <li>
                <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} rel="noopener noreferrer" target="_blank">
                  Open in Google Maps<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
              <li>
                <a href={`https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(bench.title)}`} rel="noopener noreferrer" target="_blank">
                  Open in Apple Maps<span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            </ul>
          </section>

          <section aria-labelledby="similar-heading">
            <h2 id="similar-heading" className="text-xl">Find similar benches</h2>
            <div className="mt-3">
              <TagLinks bench={bench} />
            </div>
          </section>

          <section aria-labelledby="share-heading">
            <h2 id="share-heading" className="text-xl">Share this bench</h2>
            <div className="mt-3">
              <ShareControls url={url} title={bench.title} />
            </div>
          </section>
        </aside>
      </div>

      {nearby.length > 0 && (
        <section aria-labelledby="nearby-heading" className="frame mt-16">
          <h2 id="nearby-heading" className="border-b border-rule pb-3 text-3xl">Nearby benches</h2>
          <ul className="mt-6 grid gap-8 sm:grid-cols-3">
            {nearby.map(({ bench: b, meters, direction }) => {
              const photo = b.view ?? b.photos[0];
              return (
                <li key={b.slug}>
                  <Link href={`/benches/${b.slug}`} className="group block text-ink no-underline">
                    <span className="photo-frame block aspect-[4/3] overflow-hidden rounded-lg">
                      <Image
                        src={photoSrc(b.slug, photo)}
                        alt=""
                        width={photo.width}
                        height={photo.height}
                        sizes="(max-width: 640px) 100vw, 360px"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        {...blur(b.slug, photo.file)}
                      />
                    </span>
                    <span className="mt-3 block text-xl group-hover:text-pond group-hover:underline">{b.title}</span>
                    <span className="meta block">
                      {cap(formatWalkingDistance(meters))} {direction}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </article>
  );
}
