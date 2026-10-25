import type { Metadata } from "next";
import Link from "next/link";
import { BenchIcon } from "@/components/icons";

export const metadata: Metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="frame py-20 sm:py-28">
      <BenchIcon className="h-12 w-12 text-moss" />
      <h1 className="display mt-6 text-5xl sm:text-6xl">This bench is empty.</h1>
      <p className="lede mt-5">
        There&apos;s nothing at this address. The page may have moved, or the link may have a typo.
      </p>
      <ul className="mt-8 space-y-2 text-lg">
        <li>
          <Link href="/benches">Browse all benches</Link>
        </li>
        <li>
          <Link href="/map">Open the map</Link>
        </li>
        <li>
          <Link href="/">Go to the home page</Link>
        </li>
      </ul>
    </div>
  );
}
