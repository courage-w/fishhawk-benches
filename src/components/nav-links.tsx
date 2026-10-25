"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string };

/** Client-only so the current page can be marked with aria-current. */
export function NavLinks({ items }: { items: readonly Item[] }) {
  const pathname = usePathname();
  return (
    <ul className="-mx-2 flex flex-wrap items-center">
      {items.map((item) => {
        const current = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              className="inline-flex min-h-11 items-center rounded-md px-2 text-[1.05rem] text-ink-soft no-underline hover:text-pond aria-[current=page]:text-ink aria-[current=page]:underline aria-[current=page]:decoration-moss aria-[current=page]:decoration-2 aria-[current=page]:underline-offset-8"
            >
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
