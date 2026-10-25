/** Quiet placeholder shown while a page streams in; mirrors the page's rough shape. */
export function LoadingSkeleton({ withPanorama = false }: { withPanorama?: boolean }) {
  return (
    <div role="status" aria-label="Loading" className="animate-pulse motion-reduce:animate-none">
      <div className="frame pt-12 sm:pt-16">
        <div className="h-4 w-32 rounded bg-rule" />
        <div className="mt-6 h-12 w-2/3 max-w-xl rounded bg-rule" />
        <div className="mt-6 h-5 w-full max-w-lg rounded bg-rule" />
        <div className="mt-3 h-5 w-4/5 max-w-md rounded bg-rule" />
      </div>
      {withPanorama ? (
        <div className="mt-10 h-[clamp(16rem,52vh,34rem)] bg-reed" />
      ) : (
        <div className="frame mt-10 space-y-8">
          {[0, 1, 2].map((i) => (
            <div key={i} className="grid gap-6 sm:grid-cols-[20rem_1fr]">
              <div className="aspect-[4/3] rounded-lg bg-reed" />
              <div className="space-y-3 self-center">
                <div className="h-7 w-1/2 rounded bg-rule" />
                <div className="h-4 w-full rounded bg-rule" />
              </div>
            </div>
          ))}
        </div>
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
