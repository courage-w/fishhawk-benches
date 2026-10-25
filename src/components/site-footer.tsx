import Link from "next/link";
import { site } from "@/lib/site";

const LINKS = [
  { href: "/benches", label: "All benches" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Suggest a bench" },
  { href: "/feed.xml", label: "RSS feed" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule bg-paper-raised">
      <div className="frame grid gap-8 py-12 sm:grid-cols-[1fr_auto]">
        <div className="max-w-md">
          <p className="text-xl">{site.name}</p>
          <p className="meta mt-2">
            A small, independent guide to sitting down outside in FishHawk Ranch. Not affiliated with
            any homeowners&apos; association, district, or county office.
          </p>
          <p className="meta mt-4">
            Near the ponds, keep an eye out for alligators and snakes, and stay back from the water&apos;s
            edge.
          </p>
        </div>
        <nav aria-label="Footer">
          <ul className="grid grid-cols-2 gap-x-8 sm:grid-cols-1">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="inline-flex min-h-11 items-center text-ink-soft no-underline hover:text-pond hover:underline">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="frame pb-8">
        <p className="meta text-sm">
          Photos and text © {site.since} {site.name}. Map data © OpenStreetMap contributors.
        </p>
      </div>
    </footer>
  );
}
