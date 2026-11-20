"use client";

import Link from "next/link";

export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <div className="frame py-20 sm:py-28">
      <h1 className="display text-5xl sm:text-6xl">Something went wrong.</h1>
      <p className="lede mt-5">This page didn&apos;t load properly. It&apos;s probably temporary.</p>
      <div className="mt-8 flex flex-wrap items-center gap-6">
        <button
          type="button"
          onClick={() => retry()}
          className="inline-flex min-h-12 cursor-pointer items-center rounded-md bg-pond px-6 font-sans text-ui-lg font-semibold text-paper hover:bg-pond-deep"
        >
          Try again
        </button>
        <Link href="/">Go to the home page</Link>
      </div>
    </div>
  );
}
