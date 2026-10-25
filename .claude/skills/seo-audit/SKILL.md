---
name: seo-audit
description: SEO audit for FishHawk Benches. Use when asked to check search visibility or after adding pages or benches; checks titles and descriptions, canonical URLs, Article/BreadcrumbList structured data, indexing and noindex, internal links, sitemap, RSS, robots.txt and image alt/size metadata against the production build.
---

# SEO audit (FishHawk Benches)

Audit the **production build**, not dev. Follow Google Search Central guidance; never add
misleading structured data or promise rankings. Report only what you checked.

## 1. Build and serve

```bash
npm run build
npm run start -- -p 3300
```

(Run the server in the background.) Use `http://localhost:3300` below. `NEXT_PUBLIC_SITE_URL`
controls absolute URLs; in production it must be the real https origin.

## 2. Crawl the indexable pages

Get the URL list from `/sitemap.xml`. For each URL fetch the HTML (curl or a browser) and check:

- HTTP 200; exactly one `<h1>`; heading levels don't skip.
- `<title>` unique across the site, ≤ ~60 chars, ends with "| FishHawk Benches" (home excepted).
- `<meta name="description">` unique, ~70–160 chars, describes that page.
- `<link rel="canonical">` is absolute, uses `NEXT_PUBLIC_SITE_URL`, and points to itself.
- Open Graph: `og:title`, `og:description`, `og:url`; bench pages also `og:type=article`,
  `og:image` (absolute, existing photo with width/height), `article:published_time`.
- No `noindex` on pages that should rank. Empty tag pages are intentionally `noindex`.

## 3. Structured data (bench pages)

Parse every `script[type="application/ld+json"]`:
- `Article`: `headline` = page title, `datePublished`/`dateModified` match frontmatter,
  `image` URLs resolve, `author`/`publisher` are the site, `contentLocation.geo` matches the
  bench's coordinates.
- `BreadcrumbList` positions 1..n with absolute `item` URLs.
Optionally paste one page's HTML into Google's Rich Results Test (manual; note it as not run if skipped).

## 4. Not-found behavior

`/benches/does-not-exist`, `/benches/page/999`, `/benches/tag/nope`, `/random` must return
**404** with `noindex`. `/benches/page/1` must redirect to `/benches`.

## 5. Sitemap, robots, RSS

- `/sitemap.xml`: every published bench, non-empty tag pages, static pages; no drafts, no 404s,
  `lastModified` = `updatedAt ?? addedAt`.
- `/robots.txt`: allows crawling and lists the absolute sitemap URL.
- `/feed.xml`: well-formed XML (e.g. parse with a strict XML parser), `application/rss+xml`,
  one `<item>` per published bench, absolute links.

## 6. Internal links and images

- Every bench is linked from `/benches` and `/map`; each bench page links to nearby benches and tags.
- Check every internal `href` on crawled pages returns 200 (no links to drafts or removed benches).
- Every `<img>` in `main` has meaningful `alt` (decorative duplicates use `alt=""`), width/height
  set (no layout shift), and comes through `/_next/image` except map tiles.
- `npm run validate` confirms photo dimensions match frontmatter.

## 7. Automated checks

```bash
npx playwright test -g "metadata|feeds and crawling|404"
```

## 8. Report

Table of URL × issue with a suggested fix, then a list of checks run and checks skipped. Add a
reminder of the manual Search Console steps in README ("Search Console") if this is a first launch.
