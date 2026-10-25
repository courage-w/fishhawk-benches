# FishHawk Benches

A calm little field guide to the benches of FishHawk Ranch: the view from each seat, a
panorama you can scroll around, honest pros and cons, and a map with every bench and trash can.

Built with Next.js 16 (App Router, fully prerendered), TypeScript, Tailwind CSS 4, Leaflet +
OpenStreetMap, and Markdown content files. No database, no cookies, no analytics.

---

## Run it on your computer

You need **Node.js 20.9 or newer** (24 LTS recommended) and Git.

```bash
npm install
cp .env.example .env.local     # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. Edits to code and content show up as you save.

## Add new benches (the fun part)

1. On your walk, at each bench take: the **view from the seat**, a couple of **photos of the
   bench**, and a **panorama** last. Keep Location Services on for the Camera.
2. Copy the photos (HEIC is fine) into a folder called `photos-inbox/` in this project.
   Put trash-can photos in `photos-inbox-trash/` instead.
3. See how they'll be grouped:
   ```bash
   npm run ingest -- --dry-run
   ```
4. Import them:
   ```bash
   npm run ingest
   npm run ingest -- --trash --inbox photos-inbox-trash
   ```
   Each bench becomes a draft in `content/benches/`, with web-sized photos in `public/photos/`.
   Location data is stripped from the published photos automatically.
5. Open each new draft and fill in the `TODO`s: a name, a short summary, which photo is the
   `view`, alt text for every photo, and the `features` (water view, shade, trash can, road).
   Pros and cons are generated from those features. Rename the file to a nice slug like
   `shady-pond-corner.md`, and rename its photo folder to match.
6. Mark where the seat view is inside the panorama (the two lines on the page):
   ```bash
   npm run locate-views -- --preview
   ```
   Check the yellow boxes in `.seat-view-preview/`. If one is wrong or "not confident", set
   `seatView: { center: 0.4, width: 0.25 }` on the panorama photo by hand (fractions of its width).
7. Preview drafts with `SHOW_DRAFTS=true npm run dev`. When happy, set `status: published`.
8. Check everything:
   ```bash
   npm run validate
   npm run check
   ```

If you use Claude Code in this folder, run `/publish-post` and it walks through all of this.

### Content format

```yaml
---
title: Between Two Ponds
summary: A bench on a grassy rise with water on both sides…   # 20–220 chars
status: published            # or draft
addedAt: 2026-10-25
updatedAt: 2026-11-02        # optional
location: { lat: 27.847..., lng: -82.220... }
facing: 310                  # optional, overrides the view photo's compass heading
features:
  waterView: true            # pro: looks out over the water
  facesRoad: false           # con: faces the road
  roadNearby: false          # con: a road runs close by
  shade: none                # none (con) | partial (pro) | full (pro)
  trashCan: false            # pro: trash can right next to it
extraPros: ["Big open sky, good for sunsets"]
extraCons: []
photos:
  - file: img_2474.jpg
    role: view               # view | panorama | bench | around
    alt: The view from the bench: green grass down to a blue pond…
    width: 2000
    height: 1500
    heading: 310
    credit: Jane Doe         # only if someone else took it
---

A few sentences in Markdown. No HTML.
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` / `npm start` | Production build / serve it |
| `npm run lint` | ESLint |
| `npm run typecheck` | Route types + TypeScript |
| `npm run validate` | Checks every bench, photo and trash spot |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests incl. accessibility and performance budget (Playwright; run `npm run build` first and `npx playwright install chromium` once) |
| `npm run check` | lint + typecheck + validate + test + build |
| `npm run ingest` | Import photos into draft benches |
| `npm run locate-views` | Find the seat view inside each panorama (`--all` to redo, `--preview` to check) |

## Environment variables

| Name | Needed for | Notes |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Production | Your https origin. Used for canonical URLs, sitemap, RSS. Build fails if it's not https (except localhost). |
| `RESEND_API_KEY` | Contact form | Secret. From resend.com. |
| `CONTACT_TO_EMAIL` | Contact form | Your inbox. |
| `CONTACT_FROM_EMAIL` | Contact form | Sender on a domain you verified in Resend. |
| `CONTACT_DELIVERY` | Optional | `resend` (default) or `log` for local testing. |
| `CONTACT_RATE_LIMIT` | Optional | Messages per visitor per 15 min (default 5). |
| `SHOW_DRAFTS` | Optional | `true` shows drafts in `npm run dev` only. |

Without the three contact variables the site works, but the form tells visitors it isn't set
up yet. Nothing breaks.

## Contact form

Messages go through a Next.js Server Action. That gives you:

- server-side validation (zod),
- CSRF protection (Next.js checks the Origin header),
- a honeypot field, a too-fast-to-be-human check, and a link-flood check,
- rate limits of 5 per visitor per 15 minutes and 60 per hour site-wide.

From there, messages are emailed via Resend. Nothing is stored.

**Rate-limit caveat:** the counters live in server memory. On serverless hosting each instance
counts separately, and counts reset on deploy. That's fine for a small site. If spam gets through,
move the limiter to a shared store such as Upstash Redis, or put Cloudflare Turnstile in front of the form.

### Setting up Resend (free tier is plenty)

1. Create an account at resend.com and add your domain. Add the DNS records it shows you
   (SPF/DKIM) at your domain registrar.
2. Create an API key with "sending access" only.
3. Add `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and `CONTACT_FROM_EMAIL` to your host's environment
   variables (not to a committed file).

## Deploying

The recommended host is **Vercel**, which comes from the makers of Next.js and supports every
feature used here with no config. Netlify and other Node hosts work too; Next.js needs to run as
a Node server for the contact form and image optimization.

1. Push this folder to a **private or public GitHub repo** (`photos-inbox*/` and `.env*` are
   git-ignored).
2. On vercel.com, choose **Add New → Project** and import the repo. Framework: Next.js, root:
   this folder. Defaults are fine (`npm run build`).
3. Under **Settings → Environment Variables**, add the variables above for *Production* (and
   *Preview* if you want the form to work on previews; you can use `CONTACT_DELIVERY=log` there).
4. Deploy. Every push to `main` deploys production; every other branch or PR gets its own
   **preview URL**. Check previews before merging.

### Domain and HTTPS

- Buy a domain anywhere, then in Vercel go to **Settings → Domains → Add** and follow the DNS
  instructions (an A record or CNAME). Vercel issues and renews HTTPS certificates automatically.
- Set `NEXT_PUBLIC_SITE_URL` to `https://your-domain` and redeploy so canonical URLs and the
  sitemap use it.
- The site sends HSTS (`max-age` = 2 years, including subdomains). Only add `preload` and submit
  to hstspreload.org once you're sure every subdomain will always use HTTPS.

### Rolling back

On Vercel, open **Deployments**, pick the last good deployment, and choose **Promote to
Production** (instant, no rebuild). In Git, `git revert <bad-commit>` and push. Avoid force-pushing.

### After each deploy (2-minute smoke test)

- `/` loads, panorama scrolls, map shows pins.
- Open two bench pages and `/map`; toggle trash cans.
- `/benches/not-a-bench` shows "This bench is empty." (404).
- `/feed.xml`, `/sitemap.xml`, and `/robots.txt` load and show your real domain.
- Send yourself a test message from `/contact` and check it arrives.
- Spot-check security headers with `curl -I https://your-domain` (look for
  `content-security-policy` and `strict-transport-security`).

### Monitoring (all optional, none installed)

- Vercel's dashboard shows build and function logs; check it if the contact form misbehaves
  (logs contain no personal data).
- A free uptime checker (UptimeRobot, Better Stack) pinging `/` every few minutes.
- Vercel Speed Insights or Web Analytics are privacy-friendly. They're still third parties,
  though, so update `/privacy` before turning them on.

## Google Search Console

1. Go to search.google.com/search-console and add a **Domain** property for your domain. Verify
   it with the DNS TXT record it gives you.
2. Under **Sitemaps**, submit `https://your-domain/sitemap.xml`.
3. Use **URL Inspection** on the home page and one bench page, then **Request indexing**.
4. Check **Pages** and **Enhancements** after a few days for errors. Nothing about ranking is
   guaranteed; good photos and accurate descriptions are the best SEO here.

## Project layout

```
content/benches/*.md      bench entries
content/trash-cans.json   trash-can map spots
public/photos/            published, metadata-free photos
scripts/                  ingest + validate (run with plain `node`)
src/app/                  pages, feed, sitemap, robots, contact action
src/components/           UI pieces (map, panorama, bench parts…)
src/lib/                  content schema/loader, geo, clustering, contact logic
tests/unit, tests/e2e     Vitest and Playwright
.claude/skills/           Claude Code skills: publish-post, security-review, seo-audit, release-check
```

See `LEGAL-REVIEW.md` for what still needs a human (and ideally a lawyer) to confirm.
