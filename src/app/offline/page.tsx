import type { Metadata } from "next";
import Link from "next/link";

export const ensureStatic = "navigation";

export const metadata: Metadata = {
  title: "You're offline",
  robots: { index: false },
};

// Shown by the service worker when there's no signal and this page wasn't saved yet.
export default function OfflinePage() {
  return (
    <div className="frame pt-12 sm:pt-16">
      <h1 className="display text-5xl sm:text-6xl">No signal right now</h1>
      <div className="prose mt-8">
        <p className="lede">This page hasn&apos;t been saved on this phone yet, so it can&apos;t open without a connection.</p>
        <p>
          Pages you&apos;ve already opened, with their photos and the parts of the map you looked at, still work
          offline. Try <Link href="/">the home page</Link> or <Link href="/map">the map</Link>, or come back when
          you have signal.
        </p>
      </div>
    </div>
  );
}
