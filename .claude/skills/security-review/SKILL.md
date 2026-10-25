---
name: security-review
description: Security review of changed code in the FishHawk Benches site. Use before committing or releasing changes, or when asked to check for vulnerabilities, exposed secrets, unsafe rendering, missing validation, or insecure configuration (headers/CSP, contact form, content loading, photo metadata, dependencies).
---

# Security review (FishHawk Benches)

Review what changed, report findings with file:line, severity and a concrete fix. Only say a
check passed if you ran it. If nothing is wrong, say exactly what you looked at.

## 1. Scope the change

```bash
git status --short
git diff --stat HEAD
git diff HEAD
```

If there's no git history yet, review the whole of `src/`, `scripts/`, `next.config.ts`,
`content/`, and `public/photos/` instead.

## 2. Secrets and server-only data

- Search the diff and repo for secrets: `git grep -nIE "(re_[A-Za-z0-9]{10,}|api[_-]?key|secret|password|token)\s*[:=]"`.
  `.env*` must stay git-ignored (except `.env.example` with placeholder names only).
- Secrets must not use the `NEXT_PUBLIC_` prefix and must only be read in server code
  (`src/lib/contact/mailer.ts` imports `server-only`; keep it that way).
- Client components (`"use client"`) must not import server modules (`fs`, `load.ts`, `mailer.ts`, zod schemas).
- Error messages shown to visitors must not leak env names, stack traces or provider responses.

## 3. Untrusted input and rendering

- Content files are untrusted. All of it must go through `parseBenchSource` / `trashSpotsSchema`.
  Schemas are `.strict()`; new fields need validation, length caps and formats.
- Slugs and photo file names are regex-checked before touching the filesystem. Any new `fs` path
  built from data must be validated the same way (no `..`, no separators).
- Markdown is rendered by `src/components/markdown.tsx` with no raw HTML (`skipHtml`, no
  `rehype-raw`), no MDX, images disabled. Flag any `dangerouslySetInnerHTML` other than JSON-LD
  (`<` escaped) and the static SVG pin strings in `bench-map.tsx`.
- Leaflet popups must be built with DOM APIs and `textContent`, never HTML strings from data.
- RSS output must pass every value through `escapeXml`.
- External links: `rel="noopener noreferrer"`; URLs must not be built from unvalidated input.

## 4. Contact form (`src/app/contact/actions.ts`, `src/lib/contact/*`)

- Server-side validation with zod for every field; length caps; CR/LF stripped from single-line
  fields (header injection).
- Honeypot + timing check + per-IP and site-wide rate limits still in place and not bypassable by
  omitting fields.
- Server Action CSRF: Next.js checks Origin vs Host. Flag any added `serverActions.allowedOrigins`.
- `CONTACT_DELIVERY=log` must stay refused in production unless `ALLOW_LOG_DELIVERY=true` (tests only).
- Nothing personal is logged or stored. No new cookies, analytics, or databases without the user's
  explicit request and a privacy-policy update.

## 5. Headers and config (`next.config.ts`)

- CSP still has `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`,
  `base-uri 'self'`, `form-action 'self'`; any new origin must be justified (and added to the
  privacy policy if it receives visitor data). `'unsafe-eval'` only in development.
- HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` present;
  `poweredByHeader: false`. `images.remotePatterns` stays empty unless needed.

## 6. Photo privacy

```bash
npm run validate   # fails if any published photo still has EXIF/XMP (GPS) metadata
```

Raw phone photos (`photos-inbox*/`) must stay git-ignored.

## 7. Dependencies

```bash
npm audit
npm outdated
```

Report vulnerabilities by severity and whether they reach production code (`npm audit --omit=dev`).
Don't upgrade majors blindly; propose them.

## 8. Report

List findings ordered by severity (critical, high, medium, low), each with file:line, the risk,
and the fix. Then list the commands you ran and their results.
