import Link from "next/link";
import { BenchIcon } from "./icons";
import { NavLinks } from "./nav-links";
import { site } from "@/lib/site";

export const NAV = [
  { href: "/benches", label: "Benches" },
  { href: "/map", label: "Map" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Say hello" },
] as const;

export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="frame flex flex-wrap items-center justify-between gap-x-8 gap-y-2 py-4">
        <Link
          href="/"
          className="flex min-h-11 items-center gap-2 text-xl text-ink no-underline hover:text-pond"
        >
          <BenchIcon className="h-6 w-6 text-pond" />
          <span>{site.name}</span>
        </Link>
        <nav aria-label="Main">
          <NavLinks items={NAV} />
        </nav>
      </div>
    </header>
  );
}
