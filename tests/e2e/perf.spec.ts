import { gzipSync } from "node:zlib";
import { expect, test } from "@playwright/test";

// Performance budget on the production build, measured in Chromium with no throttling.
// Local numbers are optimistic; treat these as regression alarms, not real-world scores.
const BUDGET = { jsKb: 300, lcpMs: 2500, cls: 0.1 };

for (const path of ["/", "/benches/between-two-ponds", "/map"]) {
  test(`budget: ${path}`, async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "measured once");
    await page.route("https://tile.openstreetmap.org/**", (r) => r.fulfill({ status: 204 }));

    // Count gzipped size (what crosses the network); Playwright hands us decoded bodies.
    let jsBytes = 0;
    page.on("response", async (res) => {
      if (res.request().resourceType() === "script") {
        const body = await res.body().catch(() => Buffer.alloc(0));
        jsBytes += gzipSync(body).length;
      }
    });

    await page.goto(path, { waitUntil: "networkidle" });
    const metrics = await page.evaluate(
      () =>
        new Promise<{ lcp: number; cls: number }>((resolve) => {
          let lcp = 0;
          let cls = 0;
          new PerformanceObserver((l) => l.getEntries().forEach((e) => (lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
          new PerformanceObserver((l) =>
            l.getEntries().forEach((e) => {
              const shift = e as PerformanceEntry & { value: number; hadRecentInput: boolean };
              if (!shift.hadRecentInput) cls += shift.value;
            }),
          ).observe({ type: "layout-shift", buffered: true });
          setTimeout(() => resolve({ lcp, cls }), 1000);
        }),
    );

    const jsKb = Math.round(jsBytes / 1024);
    console.log(`${path}: JS ${jsKb} KB (transferred), LCP ${Math.round(metrics.lcp)} ms, CLS ${metrics.cls.toFixed(3)}`);
    expect(jsKb).toBeLessThan(BUDGET.jsKb);
    expect(metrics.lcp).toBeLessThan(BUDGET.lcpMs);
    expect(metrics.cls).toBeLessThan(BUDGET.cls);
  });
}
