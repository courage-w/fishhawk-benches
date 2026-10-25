import Link from "next/link";
import type { ReactNode } from "react";
import { BenchRow } from "./bench-parts";
import type { Bench } from "@/lib/content/parse";
import { TAGS, TAG_SLUGS, type TagSlug } from "@/lib/content/traits";

type Props = {
  title: string;
  intro: ReactNode;
  benches: Bench[];
  page: number;
  totalPages: number;
  /** Builds the URL for a page number. */
  hrefFor: (page: number) => string;
  activeTag?: TagSlug;
  tagCounts: Record<TagSlug, number>;
};

export function BenchArchive({ title, intro, benches, page, totalPages, hrefFor, activeTag, tagCounts }: Props) {
  return (
    <div className="frame pt-12 sm:pt-16">
      <h1 className="display text-5xl sm:text-6xl">{title}</h1>
      <div className="lede mt-5">{intro}</div>

      <nav aria-label="Filter benches" className="mt-8">
        <ul className="flex flex-wrap gap-2">
          <li>
            <Link
              href="/benches"
              aria-current={activeTag ? undefined : "page"}
              className="inline-flex min-h-11 items-center rounded-full border border-rule px-4 text-base text-ink-soft no-underline hover:border-pond hover:text-pond aria-[current=page]:border-pond aria-[current=page]:bg-pond aria-[current=page]:text-paper aria-[current=page]:hover:bg-pond-deep aria-[current=page]:hover:text-paper"
            >
              All
            </Link>
          </li>
          {TAG_SLUGS.filter((t) => tagCounts[t] > 0).map((t) => (
            <li key={t}>
              <Link
                href={`/benches/tag/${t}`}
                aria-current={activeTag === t ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-full border border-rule px-4 text-base text-ink-soft no-underline hover:border-pond hover:text-pond aria-[current=page]:border-pond aria-[current=page]:bg-pond aria-[current=page]:text-paper aria-[current=page]:hover:bg-pond-deep aria-[current=page]:hover:text-paper"
              >
                {TAGS[t].label} ({tagCounts[t]})
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {benches.length > 0 ? (
        <div className="mt-6 divide-y divide-rule border-t border-rule">
          {benches.map((b, i) => (
            <BenchRow key={b.slug} bench={b} headingLevel={2} eager={i < 2} />
          ))}
        </div>
      ) : (
        <p className="mt-10 rounded-lg border border-rule p-6 text-ink-soft">
          No benches here yet. <Link href="/benches">See all benches</Link>.
        </p>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pages" className="mt-10 flex items-center justify-between border-t border-rule pt-6">
          {page > 1 ? (
            <Link href={hrefFor(page - 1)} rel="prev" className="min-h-11 content-center">
              Newer benches
            </Link>
          ) : (
            <span />
          )}
          <span className="meta">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={hrefFor(page + 1)} rel="next" className="min-h-11 content-center">
              Older benches
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}

export function tagCounts(benches: Bench[]): Record<TagSlug, number> {
  return Object.fromEntries(TAG_SLUGS.map((t) => [t, benches.filter((b) => b.tags.includes(t)).length])) as Record<
    TagSlug,
    number
  >;
}
