// Server-rendered building blocks for bench listings and bench pages.
import Image from "next/image";
import Link from "next/link";
import { CompassArrow, DashIcon, LeafIcon } from "./icons";
import { photoSrc, type Bench } from "@/lib/content/parse";
import { SHADE_LABEL, TAGS } from "@/lib/content/traits";
import { sunSummary } from "@/lib/sun";

export function facingSentence(bench: Bench): string | null {
  return bench.facingPoint ? `Faces ${bench.facingPoint}` : null;
}

/** One-line plain-language summary of the key features, e.g. "Water view, full shade, trash can". */
export function featureLine(bench: Bench): string {
  const f = bench.features;
  const parts = [
    f.waterView ? "water view" : f.facesRoad ? "road view" : "park view",
    f.shade === "full" ? "full shade" : f.shade === "partial" ? "some shade" : "no shade",
  ];
  if (f.trashCan) parts.push("trash can");
  if (bench.tags.includes("sunsets")) parts.push("sunsets");
  if (bench.tags.includes("sunrises")) parts.push("sunrises");
  const text = parts.join(", ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** A row in a bench listing: the view from the seat, then the words. */
export function BenchRow({ bench, headingLevel = 3, eager = false }: { bench: Bench; headingLevel?: 2 | 3; eager?: boolean }) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const photo = bench.view ?? bench.photos[0];
  return (
    <article className="group grid gap-5 py-8 sm:grid-cols-[minmax(0,20rem)_1fr] sm:gap-8">
      <Link href={`/benches/${bench.slug}`} tabIndex={-1} aria-hidden="true" className="photo-frame block aspect-[4/3] rounded-lg">
        <Image
          src={photoSrc(bench.slug, photo)}
          alt=""
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 640px) 100vw, 320px"
          loading={eager ? "eager" : "lazy"}
          className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
        />
      </Link>
      <div className="flex flex-col justify-center">
        <Heading className="text-[1.65rem] leading-tight">
          <Link href={`/benches/${bench.slug}`} className="text-ink no-underline hover:text-pond hover:underline">
            {bench.title}
          </Link>
        </Heading>
        <p className="mt-2 max-w-xl text-ink-soft">{bench.summary}</p>
        <p className="meta mt-3 flex flex-wrap items-center gap-x-2">
          {bench.facingDegrees !== null && (
            <CompassArrow degrees={bench.facingDegrees} className="h-5 w-5 text-pond" />
          )}
          <span>
            {[facingSentence(bench), featureLine(bench)].filter(Boolean).join(". ")}.
          </span>
        </p>
      </div>
    </article>
  );
}

export function FactList({ bench }: { bench: Bench }) {
  const f = bench.features;
  const facts: [string, string][] = [
    ["Faces", bench.facingPoint ? `${cap(bench.facingPoint)} (${Math.round(bench.facingDegrees!)}°)` : "Not recorded"],
    ["Water view", f.waterView ? "Yes" : "No"],
    ["Shade", SHADE_LABEL[f.shade]],
    ["Trash can", f.trashCan ? "Right beside it" : "No"],
    ["Road", f.facesRoad ? "In front of you" : f.roadNearby ? "Nearby" : "Out of sight"],
    ...(bench.sun ? [["Sun", sunSummary(bench.sun)] as [string, string]] : []),
  ];
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
      {facts.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-soft">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProsCons({ bench }: { bench: Bench }) {
  return (
    <div className="grid gap-8 sm:grid-cols-2">
      <section aria-labelledby="pros-heading">
        <h2 id="pros-heading" className="text-xl">Pros</h2>
        {bench.pros.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {bench.pros.map((p) => (
              <li key={p} className="flex gap-2">
                <LeafIcon className="mt-1 h-5 w-5 shrink-0 text-moss" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="meta mt-3">Nothing stands out.</p>
        )}
      </section>
      <section aria-labelledby="cons-heading">
        <h2 id="cons-heading" className="text-xl">Cons</h2>
        {bench.cons.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {bench.cons.map((c) => (
              <li key={c} className="flex gap-2">
                <DashIcon className="mt-1 h-5 w-5 shrink-0 text-ink-soft" />
                <span>{c}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="meta mt-3">None that we noticed.</p>
        )}
      </section>
    </div>
  );
}

export function TagLinks({ bench }: { bench: Bench }) {
  if (bench.tags.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Find similar benches">
      {bench.tags.map((t) => (
        <li key={t}>
          <Link
            href={`/benches/tag/${t}`}
            className="inline-flex min-h-11 items-center rounded-full border border-rule px-4 text-base text-ink-soft no-underline hover:border-pond hover:text-pond"
          >
            {TAGS[t].label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function formatDate(iso: string): string {
  // Content dates are plain YYYY-MM-DD; format them without timezone drift.
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
}
