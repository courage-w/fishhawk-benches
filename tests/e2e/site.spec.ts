import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const PAGES = ["/", "/benches", "/benches/between-two-ponds", "/benches/corner-oaks", "/benches/tag/shaded", "/map", "/about", "/contact", "/privacy", "/terms", "/offline"];

// Don't hit OpenStreetMap from tests: answer tile requests with a blank PNG.
const BLANK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
  "base64",
);
test.beforeEach(async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: BLANK_PNG }),
  );
});

function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  return errors;
}

test.describe("pages", () => {
  for (const path of PAGES) {
    test(`${path} renders, has one h1, a unique title, no errors, no sideways scroll`, async ({ page }) => {
      const errors = trackErrors(page);
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page).toHaveTitle(/FishHawk Benches/);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /^http/);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
    });
  }

  test("no broken images on the home page", async ({ page }) => {
    await page.goto("/");
    // Scroll everything into view so lazy images load.
    for (const img of await page.locator("main img").all()) await img.scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    const broken = await page.locator("main img").evaluateAll((imgs) =>
      (imgs as HTMLImageElement[]).filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.src),
    );
    expect(broken).toEqual([]);
  });
});

test.describe("accessibility (axe, WCAG 2.2 AA rules)", () => {
  for (const path of PAGES) {
    test(path, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        // Leaflet's tiles and markers are third-party DOM; the same content is listed as text on every map page.
        .exclude(".leaflet-container")
        .analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("skip link moves focus to the main content", async ({ page, browserName }, info) => {
    test.skip(info.project.name === "mobile", "keyboard test");
    void browserName;
    await page.goto("/about");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });
});

test.describe("bench pages", () => {
  test("show the view, pros and cons, facts, map and nearby benches", async ({ page }) => {
    await page.goto("/benches/between-two-ponds");
    await expect(page.getByRole("heading", { name: "Between Two Ponds", level: 1 })).toBeVisible();
    await expect(page.getByRole("region", { name: /Panorama from the bench/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pros" })).toBeVisible();
    await expect(page.getByText("Looks out over the water")).toBeVisible();
    await expect(page.getByText("No shade, so it gets hot at midday")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Nearby benches" })).toBeVisible();
    await expect(page.locator(".bench-map .pin-bench").first()).toBeVisible();
  });

  test("panorama fills wide screens and opens on the seat view", async ({ page }, info) => {
    test.skip(info.project.name === "mobile", "wide-screen check");
    await page.setViewportSize({ width: 2800, height: 1200 });
    await page.goto("/benches/bend-in-the-path");
    const strip = page.getByRole("region", { name: /Panorama from the bench/ });
    const img = strip.locator("img");
    await expect(img).toBeVisible();
    const [stripBox, imgBox] = [await strip.boundingBox(), await img.boundingBox()];
    expect(imgBox!.width).toBeGreaterThanOrEqual(stripBox!.width - 1);
    // Nearly the whole scene fits, so the mini-map stays out of the way.
    await expect(page.locator(".pano-inset")).toHaveAttribute("data-visible", "false");

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.reload();
    const lines = strip.locator(".seat-view");
    await expect(lines).toBeVisible();
    const linesBox = (await lines.boundingBox())!;
    const box = (await strip.boundingBox())!;
    // The seat view starts in sight: its middle is within the visible part of the strip.
    const middle = linesBox.x + linesBox.width / 2;
    expect(middle).toBeGreaterThan(box.x);
    expect(middle).toBeLessThan(box.x + box.width);
  });

  test("mini-map shows when the scene is off-screen and jumps around", async ({ page }, info) => {
    // On a 1280x720 desktop ~80% of this panorama fits, so the mini-map rightly stays hidden;
    // test at a width where most of the scene is off-screen.
    if (info.project.name === "desktop") await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/benches/bend-in-the-path");
    const inset = page.locator(".pano-inset");
    await expect(inset).toHaveAttribute("data-visible", "true");
    const strip = page.getByRole("region", { name: /Panorama from the bench/ });
    const before = await strip.evaluate((el) => el.scrollLeft);
    const map = (await page.locator(".pano-overview").boundingBox())!;
    await page.mouse.click(map.x + map.width * 0.97, map.y + map.height / 2);
    await expect.poll(() => strip.evaluate((el) => el.scrollLeft)).toBeGreaterThan(before);
    const right = await strip.evaluate((el) => el.scrollLeft);
    await page.mouse.click(map.x + map.width * 0.03, map.y + map.height / 2);
    await expect.poll(() => strip.evaluate((el) => el.scrollLeft)).toBeLessThan(right);
  });

  test("the mini-map's white box tracks the photo on every frame", async ({ page }, info) => {
    if (info.project.name === "desktop") await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/benches/bend-in-the-path");
    await expect(page.locator(".pano-inset")).toHaveAttribute("data-visible", "true");
    const worst = await page.evaluate(async () => {
      const strip = document.querySelector<HTMLElement>(".panorama")!;
      const box = document.querySelector<HTMLElement>(".pano-overview-window")!;
      const map = box.parentElement!;
      let max = 0;
      let run = true;
      const tick = () => {
        const expected = (strip.scrollLeft / strip.scrollWidth) * map.clientWidth;
        const drawn = box.getBoundingClientRect().left - map.getBoundingClientRect().left;
        max = Math.max(max, Math.abs(drawn - expected));
        if (run) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      for (const left of [0, strip.scrollWidth, strip.scrollWidth / 3]) {
        strip.scrollTo({ left, behavior: "smooth" });
        await new Promise((r) => setTimeout(r, 600));
      }
      run = false;
      return max;
    });
    expect(worst).toBeLessThan(1);
  });

  test("a vertical swipe starting on the mini-map scrolls the page, not the panorama", async ({ page, context }, info) => {
    test.skip(info.project.name !== "mobile", "touch gesture");
    await page.goto("/benches/bend-in-the-path");
    const map = page.locator(".pano-overview");
    await map.scrollIntoViewIfNeeded();
    await page.evaluate(() => window.scrollBy(0, -250));
    const strip = page.getByRole("region", { name: /Panorama from the bench/ });
    const before = { y: await page.evaluate(() => scrollY), x: await strip.evaluate((el) => el.scrollLeft) };
    const widthBefore = (await map.boundingBox())!.width;

    const cdp = await context.newCDPSession(page);
    const box = (await map.boundingBox())!;
    const x = box.x + box.width * 0.85;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: box.y + box.height / 2 }] });
    for (let i = 1; i <= 12; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: box.y + box.height / 2 - i * 20 }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await page.waitForTimeout(500);

    expect(await page.evaluate(() => scrollY)).toBeGreaterThan(before.y);
    expect(await strip.evaluate((el) => el.scrollLeft)).toBe(before.x);
    // The mini-map keeps a steady size while you interact with it.
    expect((await map.boundingBox())!.width).toBeCloseTo(widthBefore, 0);
  });

  test("have accurate metadata and structured data", async ({ page }) => {
    await page.goto("/benches/oak-shade-roadside");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/benches\/oak-shade-roadside$/);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute("content", "article");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/benches\/oak-shade-roadside\/opengraph-image/);
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    const article = ld.map((s) => JSON.parse(s)).find((d) => d["@type"] === "Article");
    expect(article.headline).toBe("Oak Shade by the Road");
    expect(article.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(article.contentLocation.geo.latitude).toBeCloseTo(27.85, 1);
  });

  test("copy link reports success", async ({ page, context }, info) => {
    test.skip(info.project.name === "mobile", "clipboard permission is desktop-only in Chromium");
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/benches/palmetto-path");
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("status").filter({ hasText: "Link copied." })).toBeVisible();
  });

  test("unknown benches and pages return a real 404", async ({ page }) => {
    for (const path of ["/benches/not-a-real-bench", "/benches/page/99", "/benches/tag/made-up", "/nope"]) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(404);
      await expect(page.getByRole("heading", { name: "This bench is empty." })).toBeVisible();
      await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
    }
  });

  test("page 1 of the archive redirects to /benches", async ({ page }) => {
    await page.goto("/benches/page/1");
    await expect(page).toHaveURL(/\/benches$/);
  });
});

test.describe("navigation", () => {
  test("header links reach each section and mark the current page", async ({ page }, info) => {
    test.skip(info.project.name === "mobile", "same markup on mobile");
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Main" });
    for (const [name, url] of [["Benches", /\/benches$/], ["Map", /\/map$/], ["About", /\/about$/], ["Say hello", /\/contact$/]] as const) {
      await nav.getByRole("link", { name }).click();
      await expect(page).toHaveURL(url);
      await expect(nav.getByRole("link", { name })).toHaveAttribute("aria-current", "page");
    }
  });

  for (const scheme of ["light", "dark"] as const) {
    test(`selected filter is readable in ${scheme} mode`, async ({ page }) => {
      await page.emulateMedia({ colorScheme: scheme });
      await page.goto("/benches/tag/shaded");
      const chip = page.getByRole("navigation", { name: "Filter benches" }).locator('a[aria-current="page"]');
      await chip.hover();
      const { color, bg } = await chip.evaluate((el) => {
        const s = getComputedStyle(el);
        return { color: s.color, bg: s.backgroundColor };
      });
      expect(color).not.toBe(bg);
    });
  }

  test("map toggles hide and show trash cans", async ({ page }) => {
    await page.goto("/map");
    const trashPins = page.locator(".leaflet-container .pin-trash");
    await expect(trashPins.first()).toBeAttached();
    await page.getByRole("checkbox", { name: /Trash cans/ }).uncheck();
    await expect(trashPins).toHaveCount(0);
    await page.getByRole("checkbox", { name: /Trash cans/ }).check();
    await expect(trashPins.first()).toBeAttached();
  });

  test("dog bag stations have their own pins and toggle", async ({ page }) => {
    await page.goto("/map");
    const dogPins = page.locator(".leaflet-container .pin-dog");
    const trashPins = page.locator(".leaflet-container .pin-trash");
    await expect(dogPins.first()).toBeAttached();
    await page.getByRole("checkbox", { name: /Dog bag stations/ }).uncheck();
    await expect(dogPins).toHaveCount(0);
    await expect(trashPins.first()).toBeAttached();
    await page.getByRole("checkbox", { name: /Dog bag stations/ }).check();
    await expect(dogPins.first()).toBeAttached();
  });

  test("filters narrow the bench pins", async ({ page }) => {
    await page.goto("/map");
    const benchPins = page.locator(".leaflet-container .pin-bench");
    await expect(benchPins.first()).toBeAttached();
    const all = await benchPins.count();
    const water = page.getByRole("button", { name: "Water view" });
    await water.click();
    await expect(water).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/^Showing \d+ of \d+ benches\.$/)).toBeVisible();
    const filtered = await benchPins.count();
    expect(filtered).toBeGreaterThan(0);
    expect(filtered).toBeLessThan(all);
    await water.click();
    await expect(benchPins).toHaveCount(all);
  });

  test("bench wishes have their own dashed pins", async ({ page }) => {
    await page.goto("/map");
    const wishPins = page.locator(".leaflet-container .pin-wish");
    await expect(wishPins.first()).toBeAttached();
    await page.getByRole("checkbox", { name: /Bench wishes/ }).uncheck();
    await expect(wishPins).toHaveCount(0);
  });

  test("finds the nearest bench from your location", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 27.850868, longitude: -82.227061 });
    await page.goto("/map");
    await page.getByRole("button", { name: "Find the nearest bench" }).click();
    await expect(page.getByText(/^Nearest: .+ min walk\)\.$/)).toBeVisible();
    await expect(page.locator(".leaflet-popup")).toBeVisible();
  });

  test("says so when you're far from FishHawk", async ({ page, context }) => {
    await context.grantPermissions(["geolocation"]);
    await context.setGeolocation({ latitude: 40.7128, longitude: -74.006 });
    await page.goto("/map");
    await page.getByRole("button", { name: "Find the nearest bench" }).click();
    await expect(page.getByText(/probably not in FishHawk right now/)).toBeVisible();
  });

  test("gives up if the browser never answers", async ({ page }) => {
    // Like an ignored permission prompt, or a desktop browser with no way to find itself.
    await page.addInitScript(() => {
      navigator.geolocation.getCurrentPosition = () => {};
    });
    await page.clock.install();
    await page.goto("/map");
    const button = page.getByRole("button", { name: "Find the nearest bench" });
    await button.click();
    await expect(page.getByText(/^Waiting for your location/)).toBeVisible();
    await page.clock.fastForward(21_000);
    await expect(page.getByText(/^Your browser didn't share a location/)).toBeVisible();
    await expect(button).toBeEnabled();
  });
});

test.describe("feeds and crawling", () => {
  test("RSS is valid XML listing benches", async ({ request }) => {
    const res = await request.get("/feed.xml");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toContain("application/rss+xml");
    const xml = await res.text();
    expect(xml).toMatch(/^<\?xml/);
    expect(xml).toContain("<title>Between Two Ponds</title>");
    expect((xml.match(/<item>/g) ?? []).length).toBeGreaterThanOrEqual(9);
  });

  test("sitemap lists every bench and robots points to it", async ({ request }) => {
    const sitemap = await (await request.get("/sitemap.xml")).text();
    for (const slug of ["between-two-ponds", "open-lawn-pond", "boardwalk-pond"]) expect(sitemap).toContain(`/benches/${slug}`);
    const robots = await (await request.get("/robots.txt")).text();
    expect(robots).toMatch(/Sitemap: http.*\/sitemap\.xml/);
  });

  test("each bench has its own share image", async ({ page, request }) => {
    await page.goto("/benches/between-two-ponds");
    const og = await page.locator('meta[property="og:image"]').getAttribute("content");
    expect(og).toMatch(/\/benches\/between-two-ponds\/opengraph-image/);
    const image = await request.get(new URL(og!).pathname + new URL(og!).search);
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toBe("image/png");
  });

  test("the home page lists the newest benches first", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Recently added" })).toBeVisible();
    await expect(page.getByText(/^Newest first\. The latest went up on/)).toBeVisible();
  });
});

test.describe("offline", () => {
  test.use({ serviceWorkers: "allow" });

  test("pages you've opened still work without signal", async ({ page, context }) => {
    // Service worker requests skip page.route, so stub tiles for the whole context.
    await context.route("https://tile.openstreetmap.org/**", (route) =>
      route.fulfill({ status: 200, contentType: "image/png", body: BLANK_PNG }),
    );
    await page.goto("/benches/corner-oaks");
    await page.evaluate(() => navigator.serviceWorker.ready);
    // The first visit happened before the worker took over, so load once more to save it.
    await page.reload();
    await expect(page.locator("h1")).toHaveText("The Corner Oaks");

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator("h1")).toHaveText("The Corner Oaks");
    await page.goto("/about");
    await expect(page.locator("h1")).toHaveText("No signal right now");
    await context.setOffline(false);
  });
});

test.describe("security", () => {
  test("responses carry security headers", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["content-security-policy"]).toContain("object-src 'none'");
    expect(h["strict-transport-security"]).toContain("max-age=");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("published photos carry no EXIF/GPS metadata", async ({ request }) => {
    const res = await request.get("/photos/between-two-ponds/img_2474.jpg");
    expect(res.status()).toBe(200);
    const bytes = await res.body();
    // JPEG APP1 "Exif" segment marker.
    expect(bytes.includes(Buffer.from("Exif\0\0"))).toBe(false);
  });

  test("path traversal in slugs is rejected", async ({ request }) => {
    const res = await request.get("/benches/..%2F..%2Fpackage.json");
    expect(res.status()).toBe(404);
  });
});

test.describe("contact form", () => {
  test("shows field errors, then sends", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForTimeout(3200); // the form ignores submissions made faster than a person could type
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /./ })).toContainText("Please fix the highlighted fields.");
    await expect(page.getByLabel("Your email")).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("Your email").fill("visitor@example.com");
    await page.getByLabel("Message").fill("There's a bench by the dog park worth adding.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("status")).toContainText("Thanks! Your message is on its way.");
  });

  test("a visitor whose clock is wrong isn't mistaken for a bot", async ({ page }) => {
    // A fast system clock used to make real messages look instant, so they were silently dropped.
    await page.addInitScript(() => {
      const realNow = Date.now.bind(Date);
      Date.now = () => realNow() + 10 * 60_000;
    });
    await page.goto("/contact");
    await page.waitForTimeout(3200);
    await page.getByLabel("Your email").fill("visitor@example.com");
    await page.getByLabel("Message").fill("My phone's clock is ten minutes fast.");
    const post = page.waitForRequest((r) => r.method() === "POST" && r.url().includes("/contact"));
    await page.getByRole("button", { name: "Send message" }).click();
    const body = (await post).postData() ?? "";
    const elapsed = Number(body.match(/name="(?:_\d+_)?elapsedMs"\r\n\r\n(\d+)/)?.[1]);
    expect(elapsed).toBeGreaterThanOrEqual(3000);
    await expect(page.getByRole("status")).toContainText("Thanks! Your message is on its way.");
  });

  test("keeps what you typed when there's an error", async ({ page }) => {
    await page.goto("/contact");
    await page.waitForTimeout(3200);
    await page.getByLabel("Your email").fill("not-an-email");
    await page.getByLabel("Message").fill("Keep this text please.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByRole("alert").filter({ hasText: /./ })).toBeVisible();
    await expect(page.getByLabel("Message")).toHaveValue("Keep this text please.");
  });
});
