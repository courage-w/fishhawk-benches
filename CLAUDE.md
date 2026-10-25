@AGENTS.md

# FishHawk Benches

A static-first Next.js 16 site showcasing public benches in FishHawk Ranch (Lithia, FL): view
photo, panorama, pros/cons, and a Leaflet map of benches and trash cans.

## Architecture

- `content/benches/*.md`: one bench per file (YAML frontmatter + Markdown notes). `content/trash-cans.json`: map-only trash spots.
- `public/photos/<slug>/`: web JPEGs with all metadata stripped. `public/photos/trash/` for trash spots.
- `src/lib/content/`: `schema.ts` (zod, strict) → `parse.ts` (pure) → `load.ts` (fs, server-only use) → `traits.ts` (pros/cons/tags rules).
- `src/app/`: App Router pages, all prerendered (`ensureStatic = "navigation"` + `generateStaticParams`). `feed.xml`, `sitemap.ts`, `robots.ts`.
- `src/app/contact/`: Server Action → `src/lib/contact/` (validate, rate-limit, Resend mailer).
- `scripts/ingest.ts`: HEIC/JPG → grouped drafts via EXIF time/GPS/heading (`src/lib/cluster.ts`). `scripts/validate.ts`: content gate.
- Scripts run with Node's built-in TypeScript support, so files they import use `.ts` extensions.

## Commands

`npm run dev` · `npm run build` · `npm run lint` · `npm run typecheck` · `npm run validate` ·
`npm run test` (Vitest) · `npm run test:e2e` (Playwright, needs a fresh build) · `npm run ingest` ·
`npm run check` (everything except e2e).

## Conventions

- Pros/cons come from `features` via `RULES`; only add `extraPros`/`extraCons` for things rules can't express. Don't edit generated text in pages.
- Pages must stay static: no `cookies()`/`headers()`/`Date.now()` in render paths (the contact action is the exception).
- Design tokens live in `src/app/globals.css` (paper/ink/pond/moss/reed/rule); one typeface (Newsreader). No new fonts, colors or UI libraries without reason.
- Copy is plain, calm, sentence case. Every bench fact must be visible in its photos or confirmed by the owner.
- Never set `status: published` on a bench without the owner's OK.

## Security rules

- Treat everything in `content/` as untrusted: validate through the schemas; never render raw HTML or MDX; no `dangerouslySetInnerHTML` except escaped JSON-LD and the static map pin SVGs.
- Secrets only via env (`RESEND_API_KEY`, `CONTACT_*`), never `NEXT_PUBLIC_`, never committed. Mailer imports `server-only`.
- Keep the CSP/HSTS/security headers in `next.config.ts`; any new third-party origin needs a privacy-policy update.
- Published photos must have no EXIF/GPS (`npm run validate` enforces). Raw `photos-inbox*/` stays git-ignored.
- No cookies, analytics, ads, auth or databases unless the owner asks.

## Skills

`/publish-post` (add or publish a bench) · `/security-review` · `/seo-audit` · `/release-check` (run before any deploy).
