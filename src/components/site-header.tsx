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
          className="flex min-h-11 items-center gap-2.5 font-sans text-[1.05rem] font-bold tracking-[0.005em] text-ink no-underline hover:text-pond"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-blaze text-on-blaze">
            <BenchIcon className="h-5 w-5" />
          </span>
          <span>{site.name}</span>
        </Link>
        <nav aria-label="Main">
          <NavLinks items={NAV} />
        </nav>
      </div>
    </header>
  );
}
