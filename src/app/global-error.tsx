"use client";

import "./globals.css";

// Last-resort page for when the root layout itself fails. It replaces the whole document, so it
// brings its own <html>/<body> and can't use the header, footer or metadata.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <title>Something went wrong | FishHawk Benches</title>
        <main className="frame py-20 sm:py-28">
          <h1 className="display text-5xl sm:text-6xl">Something went wrong.</h1>
          <p className="lede mt-5">The site didn&apos;t load properly. It&apos;s probably temporary.</p>
          <div className="mt-8 flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => retry()}
              className="inline-flex min-h-12 items-center rounded-md bg-pond px-6 font-sans text-ui-lg font-semibold text-paper hover:bg-pond-deep"
            >
              Try again
            </button>
            {/* A plain link: the app's router may be what broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/">Go to the home page</a>
          </div>
        </main>
      </body>
    </html>
  );
}
