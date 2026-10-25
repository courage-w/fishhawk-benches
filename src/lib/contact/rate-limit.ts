// Fixed-window rate limiter kept in server memory.
// Limitation: each server instance keeps its own counts and they reset on restart or
// redeploy. That's enough to slow casual abuse of a low-traffic form; for strict limits
// across instances, swap this for a shared store (see README "Contact form").

type Window = { count: number; resetAt: number };

export class RateLimiter {
  private windows = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
    private readonly maxKeys = 10_000,
  ) {}

  /** Records an attempt. Returns false when the key is over its limit. */
  hit(key: string): boolean {
    const t = this.now();
    const w = this.windows.get(key);
    if (!w || w.resetAt <= t) {
      if (this.windows.size >= this.maxKeys) this.sweep(t);
      this.windows.set(key, { count: 1, resetAt: t + this.windowMs });
      return true;
    }
    w.count += 1;
    return w.count <= this.limit;
  }

  private sweep(t: number) {
    for (const [k, w] of this.windows) if (w.resetAt <= t) this.windows.delete(k);
    // Still full (a flood of unique keys): drop the oldest entries rather than grow without bound.
    if (this.windows.size >= this.maxKeys) {
      const excess = this.windows.size - this.maxKeys + 1;
      for (const k of [...this.windows.keys()].slice(0, excess)) this.windows.delete(k);
    }
  }
}
