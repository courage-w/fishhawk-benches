---
name: release-check
description: Pre-release gate for FishHawk Benches. Use before deploying, merging, or saying the site is ready; runs the project's real lint, type-check, content validation, unit tests, production build, dependency audit and Playwright browser/accessibility/performance tests, then reports results truthfully.
---

# Release check (FishHawk Benches)

Run every step, in order, from the project root. Record each command's real exit status and
the key lines of output. **Never** write "passed" for a step that failed, was skipped, or did
not run, and never weaken a test, lint rule or security check to get a green result.

## Steps

```bash
npm ci                    # only if node_modules is missing or package-lock changed
npm run lint              # ESLint (next/core-web-vitals + TypeScript rules)
npm run typecheck         # next typegen + tsc --noEmit
npm run validate          # content schema, photo files/sizes, EXIF/GPS stripped
npm run test              # Vitest unit + content integration tests
npm run build             # production build; all bench pages must prerender (○)
npm audit                 # dependency vulnerabilities (note prod vs dev with --omit=dev)
npx playwright install chromium   # first run on a machine only
npm run test:e2e          # Playwright: pages, 404s, metadata, feeds, headers, contact, axe a11y, perf budget
```

Notes:
- `test:e2e` starts `next start` itself on port 3200 with `CONTACT_DELIVERY=log`; make sure the
  build from the previous step is current and port 3200 is free.
- In the build output, any bench route marked `◐`/dynamic instead of `○` static is a regression.
- If a step fails: stop, diagnose, fix the cause, and rerun that step and everything after it.

## Manual checks (say whether you did them)

- Open the built site at phone width and desktop: home panorama scrolls, a bench page, `/map`
  pins and toggles, contact form errors.
- Light and dark mode both readable.
- `.env.example` lists every variable the code reads (`git grep -n "process.env" src`).
- Legal pages still match what the site actually does (new third parties? update `/privacy`).

## Report format

| Step | Command | Result |
|------|---------|--------|
| Lint | `npm run lint` | ✅ / ❌ (key output) |
| …    | …       | …      |

Then: failures and what was done about them, anything skipped and why, and remaining risks.
Only call the release ready if every automated step passed in this run.
